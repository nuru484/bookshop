// src/app/api/payments/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, ValidationError, NotFoundError } from '@/middlewares/error-handler';
import { settlePaystackOrder } from '@/lib/paystack-settlement';

/**
 * GET /api/payments/verify?reference=
 * Public - the redirect-callback verification. Idempotent with the webhook:
 * whichever settles first claims the Pending -> Paid transition.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const reference = req.nextUrl.searchParams.get('reference')?.trim();
    if (!reference) throw new ValidationError('A payment reference is required');

    const result = await settlePaystackOrder(reference);
    if (!result.orderId) throw new NotFoundError('No order found for this payment reference');

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Payment verified successfully' : 'Payment has not completed',
      data: {
        orderId: result.orderId,
        reference,
        status: result.status,
        total: result.total,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
