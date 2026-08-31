// src/lib/paystack-settlement.ts
// One settle function shared by the redirect-verify route and the webhook.
// Idempotency is the guarded updateMany (reference + Pending) - the database
// is the lock, and every side effect hangs off `claimed`.
import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from './prisma';
import logger from '@/utils/logger';
import { verifyPaystackTransaction } from './paystack';
import { BOOKS_TAG } from './catalog-data';
import { dispatchOrderNotification } from './sms';
import {
  sendOrderConfirmedEmail,
  sendAdminNewOrderEmail,
  type IOrderEmailPayload,
} from './mail/order-emails';
import { ENV } from '@/config/env';
import { siteConfig } from '@/lib/site';

export interface ISettlementResult {
  orderId: string | null;
  status: string;
  total: number | null;
  /** True only when THIS call transitioned Pending -> Paid. */
  claimed: boolean;
  success: boolean;
}

export const settlePaystackOrder = async (reference: string): Promise<ISettlementResult> => {
  const verified = await verifyPaystackTransaction(reference);

  const order = await prisma.order.findUnique({
    where: { paystackRef: reference },
    include: { items: { include: { book: { select: { title: true } } } } },
  });
  if (!order) {
    logger.warn({ reference }, 'Paystack verify referenced an unknown order');
    return { orderId: null, status: 'failed', total: null, claimed: false, success: false };
  }

  if (verified.status !== 'success') {
    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      claimed: false,
      success: order.status !== 'Pending',
    };
  }

  const chargedMajor = verified.amount / 100;
  if (Math.abs(chargedMajor - order.total) > 0.01) {
    // A mismatch can only mean tampering or a stale init - flag loudly.
    logger.error(
      { reference, expected: order.total, charged: chargedMajor },
      'Paystack charged amount differs from the order total',
    );
  }

  const updateResult = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { paystackRef: reference, status: 'Pending' },
      data: { status: 'Paid', paidAt: new Date(verified.paidAt ?? Date.now()) },
    });

    if (result.count > 0) {
      // Stock is committed on settlement (not at init, so abandoned
      // checkouts never hold copies). Clamped at zero.
      for (const item of order.items) {
        const book = await tx.book.findUnique({ where: { id: item.bookId }, select: { stock: true } });
        await tx.book.update({
          where: { id: item.bookId },
          data: {
            stock: Math.max(0, (book?.stock ?? 0) - item.qty),
            sold: { increment: item.qty },
          },
        });
      }
    }
    return result;
  });

  const claimed = updateResult.count > 0;

  if (claimed) {
    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout');

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
    // Fire-and-forget: notifications must never fail the settlement.
    void dispatchOrderNotification(
      { name: order.name, email: order.email, phone: order.phone },
      {
        idTag: `order-confirmed-${order.id}`,
        sms: `${siteConfig.name}: order ${order.id} confirmed (GHS ${order.total.toFixed(2)}). Track it at ${ENV.BASE_URL}/track-order`,
        sendEmail: () => sendOrderConfirmedEmail(payload),
      },
    );
    void sendAdminNewOrderEmail(payload);
  } else {
    logger.info({ orderId: order.id, reference }, 'Paystack settle was a no-op (already settled)');
  }

  const fresh = await prisma.order.findUnique({
    where: { id: order.id },
    select: { status: true, total: true },
  });

  return {
    orderId: order.id,
    status: fresh?.status ?? order.status,
    total: fresh?.total ?? order.total,
    claimed,
    success: (fresh?.status ?? order.status) !== 'Pending' && (fresh?.status ?? '') !== 'Cancelled',
  };
};
