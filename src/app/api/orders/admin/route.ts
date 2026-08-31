// src/app/api/orders/admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError } from '@/middlewares/error-handler';
import { adminOrderSchema } from '@/validations/order-validation';
import { priceOrder, nextOrderId, resolvePromo } from '@/lib/order-utils';
import { serializeOrder } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';
import { dispatchOrderNotification } from '@/lib/sms';
import { sendOrderConfirmedEmail, type IOrderEmailPayload } from '@/lib/mail/order-emails';
import { ENV } from '@/config/env';
import { siteConfig } from '@/lib/site';

/**
 * POST /api/orders/admin
 * Protected (staff) - records an order taken in the shop or over the phone.
 * Stock is committed immediately for paid orders; the customer is linked by
 * email when they already have an account, and notified either way.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const body = await req.json();
    const validation = adminOrderSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }
    const input = validation.data;
    const email = input.email.toLowerCase();

    const [books, customer, promo] = await Promise.all([
      prisma.book.findMany({ where: { id: { in: input.items.map((i) => i.id) } } }),
      prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, role: 'CUSTOMER' },
        select: { id: true },
      }),
      resolvePromo(prisma, input.promoCode || undefined),
    ]);

    const pricing = priceOrder(books, input.items, promo);
    const paid = input.status === 'Paid';

    const order = await prisma.$transaction(async (tx) => {
      if (paid) {
        for (const line of pricing.lines) {
          await tx.book.update({
            where: { id: line.bookId },
            data: { stock: { decrement: line.qty }, sold: { increment: line.qty } },
          });
        }
      }
      return tx.order.create({
        data: {
          id: await nextOrderId(tx),
          name: input.name,
          email,
          phone: input.phone,
          city: input.city,
          address: input.address,
          status: input.status,
          total: pricing.total,
          paidAt: paid ? new Date() : null,
          userId: customer?.id ?? null,
          items: {
            create: pricing.lines.map((l) => ({
              bookId: l.bookId,
              qty: l.qty,
              unitPrice: l.unitPrice,
            })),
          },
        },
        include: { items: { include: { book: { select: { title: true } } } } },
      });
    });

    if (paid) {
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
      void dispatchOrderNotification(
        { name: order.name, email: order.email, phone: order.phone },
        {
          idTag: `order-confirmed-${order.id}`,
          sms: `${siteConfig.name}: order ${order.id} confirmed (GHS ${order.total.toFixed(2)}). Track it at ${ENV.BASE_URL}/track-order`,
          sendEmail: () => sendOrderConfirmedEmail(payload),
        },
      );
    }

    return NextResponse.json(
      {
        message: `Order ${order.id} created for ${order.name}`,
        data: { ...serializeOrder(order), total: order.total },
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
