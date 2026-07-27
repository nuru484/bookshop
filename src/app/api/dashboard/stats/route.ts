// src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';
import { LOW_STOCK_THRESHOLD } from '@/data/catalog';

const DAY_MS = 24 * 60 * 60 * 1000;

export type TrendDirection = 'upward' | 'downward' | 'neutral';
export interface ITrend {
  percentage: number;
  direction: TrendDirection;
}

/** Percentage delta plus direction, mirroring the dms trend contract. */
const calculateTrend = (current: number, previous: number): ITrend => {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'upward' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(Number(change.toFixed(1))),
    direction: change > 0 ? 'upward' : change < 0 ? 'downward' : 'neutral',
  };
};

/** Monday-of-week for bucketing. */
const weekStart = (d: Date): string => {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getTime() - day * DAY_MS).toISOString().slice(0, 10);
};

const weekLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

/**
 * GET /api/dashboard/stats
 * Protected (staff). ?range=7|30|90|custom&from&to
 *
 * Everything here is computed from live data: KPIs with previous-period
 * trends, weekly revenue buckets, top titles, shelf share, the conversion
 * funnel from real order lines, a needs-attention panel, customer mix and a
 * recent-activity feed.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const sp = req.nextUrl.searchParams;
    const range = sp.get('range') ?? '30';
    const now = new Date();

    let fromDate: Date;
    let toDate = now;
    if (range === 'custom') {
      fromDate = sp.get('from')
        ? new Date(`${sp.get('from')}T00:00:00`)
        : new Date(now.getTime() - 30 * DAY_MS);
      toDate = sp.get('to') ? new Date(`${sp.get('to')}T23:59:59.999`) : now;
    } else {
      const days = range === '7' ? 7 : range === '90' ? 90 : 30;
      fromDate = new Date(now.getTime() - days * DAY_MS);
    }
    const windowMs = Math.max(toDate.getTime() - fromDate.getTime(), DAY_MS);
    const prevFrom = new Date(fromDate.getTime() - windowMs);

    const NON_CANCELLED = { not: 'Cancelled' } as const;

    const [
      ordersInRange,
      prevOrders,
      books,
      latest,
      customersInRange,
      prevCustomers,
      totalCustomers,
      itemsInRange,
      statusCounts,
      pendingRefunds,
    ] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        select: { id: true, total: true, status: true, createdAt: true, email: true },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: prevFrom, lt: fromDate }, status: NON_CANCELLED },
        select: { total: true, email: true },
      }),
      prisma.book.findMany(),
      prisma.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: fromDate, lte: toDate } },
      }),
      prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: prevFrom, lt: fromDate } },
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: fromDate, lte: toDate }, status: NON_CANCELLED } },
        select: { qty: true, unitPrice: true, bookId: true },
      }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.count({ where: { status: 'Cancelled', refundedAt: null, paidAt: { not: null } } }),
    ]);

    const active = ordersInRange.filter((o) => o.status !== 'Cancelled');
    const revenue = active.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + o.total, 0);
    const avgOrder = active.length ? revenue / active.length : 0;
    const prevAvg = prevOrders.length ? prevRevenue / prevOrders.length : 0;
    const unitsSold = itemsInRange.reduce((s, i) => s + i.qty, 0);

    // Returning vs new buyers inside the window (by email seen before it).
    const emailsBefore = new Set(prevOrders.map((o) => o.email.toLowerCase()));
    const buyerEmails = new Set(active.map((o) => o.email.toLowerCase()));
    const returningBuyers = [...buyerEmails].filter((e) => emailsBefore.has(e)).length;

    // Weekly revenue buckets across the range (empty weeks filled with 0).
    const buckets = new Map<string, number>();
    for (let t = weekStart(fromDate); t <= weekStart(toDate); ) {
      buckets.set(t, 0);
      t = weekStart(new Date(new Date(`${t}T00:00:00`).getTime() + 7 * DAY_MS));
    }
    active.forEach((o) => {
      const key = weekStart(o.createdAt);
      buckets.set(key, (buckets.get(key) ?? 0) + o.total);
    });
    const weeks = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, v]) => ({ iso, w: weekLabel(iso), v: Math.round(v) }));

    const topMax = Math.max(...books.map((b) => b.sold), 1);
    const topTitles = [...books]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((b) => ({ title: b.title, sold: b.sold, pct: Math.round((b.sold / topMax) * 100) }));

    // Shelf share from actual sales in the range (falls back to lifetime).
    const bookById = new Map(books.map((b) => [b.id, b]));
    const genreRevenue: Record<string, number> = {};
    itemsInRange.forEach((i) => {
      const book = bookById.get(i.bookId);
      if (book) genreRevenue[book.genre] = (genreRevenue[book.genre] ?? 0) + i.unitPrice * i.qty;
    });
    if (Object.keys(genreRevenue).length === 0) {
      books.forEach((b) => {
        genreRevenue[b.genre] = (genreRevenue[b.genre] ?? 0) + b.sold * b.price;
      });
    }
    const genreTotal = Object.values(genreRevenue).reduce((a, b) => a + b, 0) || 1;
    const catShare = Object.entries(genreRevenue)
      .sort((a, b) => b[1] - a[1])
      .map(([name, v]) => ({ name, pct: Math.round((v / genreTotal) * 100) }));

    // Funnel from real data: every order is a basket, non-cancelled are sales.
    const cancelled = ordersInRange.length - active.length;
    const funnel = [
      { label: 'Orders started', v: ordersInRange.length },
      { label: 'Paid', v: active.filter((o) => o.status !== 'Pending').length },
      { label: 'Shipped', v: active.filter((o) => o.status === 'Shipped' || o.status === 'Delivered').length },
      { label: 'Delivered', v: active.filter((o) => o.status === 'Delivered').length },
    ];

    const lowStock = books
      .filter((b) => b.stock <= LOW_STOCK_THRESHOLD && b.status !== 'Archived')
      .sort((a, b) => a.stock - b.stock)
      .map((b) => ({ id: b.id, title: b.title, stock: b.stock }));

    const counts: Record<string, number> = {};
    statusCounts.forEach((g) => {
      counts[g.status] = g._count._all;
    });

    const inventoryValue = books.reduce((s, b) => s + b.stock * b.price, 0);

    return NextResponse.json({
      message: 'Dashboard stats retrieved successfully',
      data: {
        kpis: {
          revenue,
          revenueTrend: calculateTrend(revenue, prevRevenue),
          orders: ordersInRange.length,
          ordersTrend: calculateTrend(ordersInRange.length, prevOrders.length),
          avgOrder: Math.round(avgOrder),
          avgOrderTrend: calculateTrend(avgOrder, prevAvg),
          unitsSold,
          newCustomers: customersInRange,
          newCustomersTrend: calculateTrend(customersInRange, prevCustomers),
          totalCustomers,
          returningBuyers,
          cancelled,
        },
        weeks,
        topTitles,
        catShare,
        funnel,
        lowStock: {
          count: lowStock.length,
          threshold: LOW_STOCK_THRESHOLD,
          preview: lowStock.slice(0, 4),
        },
        needsAttention: {
          outOfStock: books.filter((b) => b.stock === 0 && b.status === 'Published').length,
          lowStock: lowStock.filter((b) => b.stock > 0).length,
          pendingOrders: counts.Pending ?? 0,
          awaitingShipment: counts.Paid ?? 0,
          pendingRefunds,
          draftBooks: books.filter((b) => b.status === 'Draft').length,
        },
        inventory: {
          titles: books.length,
          published: books.filter((b) => b.status === 'Published').length,
          copies: books.reduce((s, b) => s + b.stock, 0),
          value: Math.round(inventoryValue),
        },
        statusCounts: counts,
        latestOrders: latest.map((o) => ({ ...serializeOrder(o), total: o.total })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
