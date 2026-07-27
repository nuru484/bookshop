// src/app/api/promos/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError, NotFoundError, ValidationError } from '@/middlewares/error-handler';

/**
 * GET /api/promos/validate?code=
 * Public - resolves an active promo so the checkout can show an accurate
 * estimate. The server recomputes everything at payment time regardless.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
    if (!code) throw new ValidationError('A promo code is required');

    const promo = await prisma.promo.findFirst({
      where: { code, active: true },
      select: { code: true, percentOff: true, genre: true, description: true },
    });
    if (!promo) throw new NotFoundError("That code isn't on our shelf.");

    return NextResponse.json({ message: `${promo.code} applied`, data: promo });
  } catch (err) {
    return handleApiError(err);
  }
}
