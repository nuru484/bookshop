// src/app/api/orders/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ratelimit } from '@/lib/rate-limit';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';
import { trackOrderSchema } from '@/validations/order-validation';

/**
 * POST /api/orders/track
 * Public - order ID plus the matching email or phone. Returns a deliberately
 * limited shape (status + items), never the customer's contact details.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const { success } = await ratelimit.limit(`track:${ip}`);
    if (!success) throw new TooManyRequestsError('Too many attempts. Please try again shortly.');

    const body = await req.json();
    const validation = trackOrderSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed');
    }
    const { orderId, contact } = validation.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId.toUpperCase() },
      include: { items: { include: { book: { select: { title: true } } } } },
    });

    const contactLower = contact.toLowerCase();
    const contactDigits = contact.replace(/\D/g, '');
    const matches =
      order &&
      (order.email.toLowerCase() === contactLower ||
        (contactDigits.length >= 9 && order.phone.replace(/\D/g, '') === contactDigits));

    if (!order || !matches) {
      // One message for both cases - never confirm an order id exists.
      throw new NotFoundError("We couldn't find that order with those details.");
    }

    return NextResponse.json({
      message: 'Order found',
      data: {
        id: order.id,
        status: order.status,
        date: order.createdAt.toISOString(),
        total: order.total,
        items: order.items.map((i) => ({ title: i.book.title, qty: i.qty })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
