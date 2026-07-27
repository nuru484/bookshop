// src/app/api/customers/[email]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError, NotFoundError, ValidationError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';

/**
 * GET /api/customers/[email]
 * Protected (staff) - one customer (order-derived + account when present)
 * with their full order history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const { email: raw } = await params;
    const email = decodeURIComponent(raw ?? '').toLowerCase();
    if (!email) throw new ValidationError('Customer email is required');

    const [orders, account, books] = await Promise.all([
      prisma.order.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        include: { items: { include: { book: { select: { title: true, genre: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, role: 'CUSTOMER' },
        select: {
          id: true,
          fullname: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          createdAt: true,
        },
      }),
      prisma.book.findMany({ select: { id: true, title: true, genre: true } }),
    ]);

    if (orders.length === 0 && !account) throw new NotFoundError('Customer not found');

    const latest = orders[0];
    const nonCancelled = orders.filter((o) => o.status !== 'Cancelled');
    const spent = nonCancelled.reduce((sum, o) => sum + o.total, 0);

    const genreCounts: Record<string, number> = {};
    orders.forEach((o) =>
      o.items.forEach((item) => {
        genreCounts[item.book.genre] = (genreCounts[item.book.genre] ?? 0) + item.qty;
      }),
    );
    const favGenre =
      Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).map(([g]) => g)[0] ?? '-';
    const lastTitle = latest?.items[0]?.book.title ?? '-';

    return NextResponse.json({
      message: 'Customer retrieved successfully',
      data: {
        name: account?.fullname ?? latest?.name ?? email,
        email: account?.email ?? latest?.email ?? email,
        phone: account?.phone ?? latest?.phone ?? '',
        address: account?.address ?? latest?.address ?? '',
        city: account?.city ?? latest?.city ?? '',
        hasAccount: Boolean(account),
        userId: account?.id,
        since: (account?.createdAt ?? orders[orders.length - 1]?.createdAt)?.toISOString() ?? '',
        favGenre,
        lastTitle,
        stats: {
          orders: orders.length,
          spent,
          avgOrder: nonCancelled.length ? Math.round(spent / nonCancelled.length) : 0,
          lastOrder: latest?.createdAt.toISOString() ?? '',
        },
        orders: orders.map((o) => ({
          ...serializeOrder(o),
          total: o.total,
          summary: o.items
            .map((i) => `${i.book.title}${i.qty > 1 ? ` ×${i.qty}` : ''}`)
            .join(', '),
        })),
        books: books, // id → title/genre lookups client-side
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
