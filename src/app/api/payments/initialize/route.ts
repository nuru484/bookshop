// src/app/api/payments/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import { ratelimit } from '@/lib/rate-limit';
import {
  handleApiError,
  ValidationError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';
import { checkoutSchema } from '@/validations/order-validation';
import { priceOrder, nextOrderId, resolvePromo } from '@/lib/order-utils';
import { generatePaystackReference, initializePaystackTransaction } from '@/lib/paystack';
import { ENV } from '@/config/env';

/**
 * POST /api/payments/initialize
 * Public checkout step 1 - validates the basket, creates a Pending order and
 * returns the Paystack authorization URL. Stock is only committed when the
 * payment settles, so abandoned checkouts never hold copies.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const { success } = await ratelimit.limit(`checkout:${ip}`);
    if (!success) throw new TooManyRequestsError('Too many attempts. Please try again shortly.');

    const body = await req.json();
    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }
    const input = validation.data;

    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);

    const books = await prisma.book.findMany({
      where: { id: { in: input.items.map((i) => i.id) } },
    });
    const promo = await resolvePromo(prisma, input.promoCode || undefined);
    const pricing = priceOrder(books, input.items, promo);

    const reference = generatePaystackReference();

    const order = await prisma.$transaction(async (tx) =>
      tx.order.create({
        data: {
          id: await nextOrderId(tx),
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          city: input.city,
          address: input.address,
          status: 'Pending',
          total: pricing.total,
          paystackRef: reference,
          userId: session?.userId ?? null,
          items: {
            create: pricing.lines.map((l) => ({
              bookId: l.bookId,
              qty: l.qty,
              unitPrice: l.unitPrice,
            })),
          },
        },
        select: { id: true, total: true },
      }),
    );

    const paystack = await initializePaystackTransaction({
      email: input.email.toLowerCase(),
      amount: Math.round(pricing.total * 100), // GHS -> pesewas
      reference,
      callbackUrl: `${ENV.BASE_URL}/checkout/verify`,
      metadata: { orderId: order.id, customerName: input.name },
    });

    return NextResponse.json(
      {
        message: 'Payment initialized',
        data: {
          orderId: order.id,
          reference,
          authorizationUrl: paystack.authorizationUrl,
          total: order.total,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
