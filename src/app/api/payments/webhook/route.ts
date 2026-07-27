// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyPaystackSignature } from '@/lib/paystack';
import { settlePaystackOrder } from '@/lib/paystack-settlement';

/**
 * POST /api/payments/webhook
 * Paystack webhook - authenticated by the HMAC-SHA512 signature of the raw
 * body (no session). Only charge.success is handled; settlement is
 * idempotent, so racing the redirect-verify is safe.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature') ?? undefined;

  if (!verifyPaystackSignature(rawBody, signature)) {
    logger.warn('Paystack webhook signature verification failed');
    return NextResponse.json({ message: 'Invalid signature' }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  if (event.event !== 'charge.success') {
    logger.info({ eventType: event.event }, 'Paystack webhook event ignored');
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    logger.warn('Paystack charge.success missing reference');
    return NextResponse.json({ received: true });
  }

  try {
    await settlePaystackOrder(reference);
  } catch (err) {
    // Log and still 200 - Paystack retries, and settlement is idempotent.
    logger.error({ err, reference }, 'Error settling Paystack webhook');
  }

  return NextResponse.json({ received: true });
}
