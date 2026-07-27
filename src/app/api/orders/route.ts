// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';
import type { OrderStatus } from '@/data/catalog';
import type { Prisma } from '@/lib/prisma';

/**
 * Orders are only ever created through the payment flow
 * (/api/payments/initialize, settled by the verified Paystack callback or
 * webhook) or by staff through /api/orders/admin. There is deliberately no
 * public order-creation endpoint here: one would let an unauthenticated
 * caller mint paid orders and drain stock without paying.
 *
 * GET /api/orders
 * Protected (staff) - paginated orders with the table's filters.
 * ?page&limit&search&status&from&to&sort=date|total&dir
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page') ?? '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '8') || 8, 1), 100);
    const search = sp.get('search')?.trim();
    const status = sp.get('status') ?? undefined;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;
    const sort = sp.get('sort') === 'total' ? 'total' : 'createdAt';
    const dir = sp.get('dir') === 'asc' ? 'asc' : 'desc';

    const where: Prisma.OrderWhereInput = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'All') where.status = status as OrderStatus;
    if (from) where.createdAt = { ...(where.createdAt as object), gte: new Date(`${from}T00:00:00`) };
    if (to)
      where.createdAt = { ...(where.createdAt as object), lte: new Date(`${to}T23:59:59.999`) };

    const [orders, total, statusGroups] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { [sort]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
      // Unfiltered status counts drive the chip labels.
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const statusCounts: Record<string, number> = {};
    let all = 0;
    for (const g of statusGroups) {
      statusCounts[g.status] = g._count._all;
      all += g._count._all;
    }
    statusCounts.All = all;

    return NextResponse.json({
      message: 'Orders retrieved successfully',
      data: orders.map((o) => ({ ...serializeOrder(o), total: o.total })),
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
      statusCounts,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
