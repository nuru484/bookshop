// src/app/api/promos/[promoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin, requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError, NotFoundError } from '@/middlewares/error-handler';

const parseId = (raw: string): number => {
  const id = parseInt(raw, 10);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid promotion id');
  return id;
};

/** PATCH /api/promos/[promoId] - staff: toggle active. */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);
    const id = parseId((await params).promoId);

    const existing = await prisma.promo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Promotion not found');

    const promo = await prisma.promo.update({
      where: { id },
      data: { active: !existing.active },
    });

    return NextResponse.json({
      message: promo.active ? `${promo.code} is live` : `${promo.code} paused`,
      data: promo,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/promos/[promoId] - admin. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ promoId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);
    const id = parseId((await params).promoId);

    const existing = await prisma.promo.findUnique({ where: { id }, select: { code: true } });
    if (!existing) throw new NotFoundError('Promotion not found');

    await prisma.promo.delete({ where: { id } });
    return NextResponse.json({ message: `${existing.code} deleted` });
  } catch (err) {
    return handleApiError(err);
  }
}
