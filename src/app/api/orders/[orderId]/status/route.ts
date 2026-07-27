// src/app/api/orders/[orderId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import {
  handleApiError,
  NotFoundError,
  ValidationError,
  BadRequestError,
} from '@/middlewares/error-handler';
import { orderStatusSchema } from '@/validations/order-validation';
import { serializeOrder } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';
import { refundPaystackTransaction } from '@/lib/paystack';
import { dispatchOrderNotification } from '@/lib/sms';
import { sendOrderStatusEmail, type IOrderEmailPayload } from '@/lib/mail/order-emails';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import type { OrderStatus } from '@/data/catalog';

const FLOW: OrderStatus[] = ['Pending', 'Paid', 'Shipped', 'Delivered'];

/**
 * PATCH /api/orders/[orderId]/status
 * Protected (staff). Actions:
 *  - advance:   step forward through Pending -> Paid -> Shipped -> Delivered
 *  - set:       jump to any status in the flow (real-world corrections)
 *  - cancel:    cancel + restock; a PAID order is refunded through Paystack
 *               first and only cancelled if the refund succeeds
 *  - reinstate: bring a cancelled order back to the status it held before
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const { orderId } = await params;
    if (!orderId) throw new ValidationError('Order ID is required');

    const body = await req.json();
    const validation = orderStatusSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Action must be advance, set, cancel or reinstate');
    }
    const { action, status: targetStatus } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId.toUpperCase() },
      include: { items: { include: { book: { select: { title: true } } } } },
    });
    if (!order) throw new NotFoundError('Order not found');

    const idx = FLOW.indexOf(order.status);
    let updated = order;
    let message = '';

    if (action === 'advance' || action === 'set') {
      if (order.status === 'Cancelled') {
        throw new BadRequestError('Reinstate this order before changing its status');
      }
      const next = action === 'set' ? targetStatus : idx < FLOW.length - 1 ? FLOW[idx + 1] : null;
      if (!next) throw new BadRequestError('Order is already delivered');
      if (next === order.status) throw new BadRequestError(`Order is already ${next}`);

      updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: next,
          // Moving out of Pending without a payment record still stamps
          // paidAt so downstream reporting stays honest about timing.
          ...(next !== 'Pending' && !order.paidAt ? { paidAt: new Date() } : {}),
        },
        include: { items: { include: { book: { select: { title: true } } } } },
      });
      message = `${updated.id} marked as ${updated.status}`;
    } else if (action === 'cancel') {
      if (order.status === 'Cancelled') throw new BadRequestError('This order is already cancelled');

      // Money first: a paid order cannot be cancelled without refunding.
      let refund: { reference: string; amount: number } | null = null;
      const wasPaid = Boolean(order.paidAt) && order.status !== 'Pending';
      if (wasPaid && !order.refundedAt) {
        if (!order.paystackRef) {
          throw new BadRequestError(
            'This order has no Paystack reference, so it cannot be refunded automatically. Refund it manually, then cancel.',
          );
        }
        const result = await refundPaystackTransaction(
          order.paystackRef,
          Math.round(order.total * 100),
        );
        refund = { reference: result.reference, amount: order.total };
        logger.info(
          { orderId: order.id, refundRef: result.reference, status: result.status },
          'Paystack refund issued',
        );
      }

      updated = await prisma.$transaction(async (tx) => {
        // Restock only what was actually taken out of stock.
        if (order.status !== 'Pending') {
          for (const item of order.items) {
            await tx.book.update({
              where: { id: item.bookId },
              data: { stock: { increment: item.qty }, sold: { decrement: item.qty } },
            });
          }
        }
        return tx.order.update({
          where: { id: order.id },
          data: {
            status: 'Cancelled',
            statusBeforeCancel: order.status,
            ...(refund
              ? { refundedAt: new Date(), refundRef: refund.reference, refundAmount: refund.amount }
              : {}),
          },
          include: { items: { include: { book: { select: { title: true } } } } },
        });
      });
      revalidateTag(BOOKS_TAG, 'max');
      revalidatePath('/', 'layout');
      message = refund
        ? `${updated.id} cancelled and refunded through Paystack`
        : `${updated.id} cancelled`;
    } else {
      // reinstate
      if (order.status !== 'Cancelled') throw new BadRequestError('This order is not cancelled');
      const restored: OrderStatus = order.statusBeforeCancel ?? 'Pending';

      updated = await prisma.$transaction(async (tx) => {
        // Take the copies back off the shelf if the order had consumed them.
        if (restored !== 'Pending') {
          for (const item of order.items) {
            const book = await tx.book.findUnique({
              where: { id: item.bookId },
              select: { stock: true, title: true },
            });
            if (!book || book.stock < item.qty) {
              throw new BadRequestError(
                `Not enough stock to reinstate this order ("${book?.title ?? 'a title'}" is short). Restock first.`,
              );
            }
            await tx.book.update({
              where: { id: item.bookId },
              data: { stock: { decrement: item.qty }, sold: { increment: item.qty } },
            });
          }
        }
        return tx.order.update({
          where: { id: order.id },
          data: { status: restored, statusBeforeCancel: null },
          include: { items: { include: { book: { select: { title: true } } } } },
        });
      });
      revalidateTag(BOOKS_TAG, 'max');
      revalidatePath('/', 'layout');
      message = `${updated.id} reinstated as ${updated.status}`;
    }

    // Customer notification (email + SMS) - fire-and-forget.
    const payload: IOrderEmailPayload = {
      orderId: order.id,
      name: order.name,
      email: order.email,
      total: order.total,
      lines: order.items.map((i) => ({
        title: i.book.title,
        qty: i.qty,
        lineTotal: i.unitPrice * i.qty,
      })),
    };
    const smsCopy =
      updated.status === 'Shipped'
        ? `Harmattan Books: order ${order.id} has shipped. Track it at ${ENV.BASE_URL}/track-order`
        : updated.status === 'Delivered'
          ? `Harmattan Books: order ${order.id} was delivered. Happy reading!`
          : updated.status === 'Cancelled'
            ? `Harmattan Books: order ${order.id} was cancelled${updated.refundedAt ? ' and refunded' : ''}.`
            : `Harmattan Books: order ${order.id} is now ${updated.status}.`;
    void dispatchOrderNotification(
      { name: order.name, email: order.email, phone: order.phone },
      {
        idTag: `order-status-${order.id}-${updated.status}`,
        sms: smsCopy,
        sendEmail: () => sendOrderStatusEmail(payload, updated.status),
      },
    );

    return NextResponse.json({
      message,
      data: { ...serializeOrder(updated), total: updated.total },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
