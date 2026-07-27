// src/app/api/orders/mine/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { handleApiError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';

/**
 * GET /api/orders/mine
 * Protected - the signed-in customer's own order history (orders linked by
 * account, plus guest orders placed with the same email).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ userId: session.userId }, ...(user ? [{ email: user.email }] : [])],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      message: 'Orders retrieved successfully',
      data: orders.map((o) => ({ ...serializeOrder(o), total: o.total })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
