// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifySession, decrypt } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { ratelimit } from '@/lib/rate-limit';
import {
  handleApiError,
  ValidationError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';
import { checkoutSchema } from '@/validations/order-validation';
import { priceOrder, nextOrderId, resolvePromo } from '@/lib/order-utils';
import { serializeOrder } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';
import type { OrderStatus } from '@/data/catalog';
import type { Prisma } from '@/lib/prisma';

/**
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

/**
 * POST /api/orders
 * Public checkout - validates the basket against live stock inside a
 * transaction, snapshots prices, decrements stock and links the order to the
 * signed-in customer when there is one. Totals are computed server-side.
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

    // Optional session: guests can order too.
    const sessionCookie = (await cookies()).get('session')?.value;
    const session = await decrypt(sessionCookie);

    const order = await prisma.$transaction(async (tx) => {
      const books = await tx.book.findMany({ where: { id: { in: input.items.map((i) => i.id) } } });
      const promo = await resolvePromo(tx, input.promoCode || undefined);
      const { lines, total } = priceOrder(books, input.items, promo);

      for (const line of lines) {
        await tx.book.update({
          where: { id: line.bookId },
          data: { stock: { decrement: line.qty }, sold: { increment: line.qty } },
        });
      }

      return tx.order.create({
        data: {
          id: await nextOrderId(tx),
          name: input.name,
          email: input.email.toLowerCase(),
          phone: input.phone,
          city: input.city,
          address: input.address,
          status: 'Paid',
          total,
          userId: session?.userId ?? null,
          items: {
            create: lines.map((l) => ({ bookId: l.bookId, qty: l.qty, unitPrice: l.unitPrice })),
          },
        },
        include: { items: true },
      });
    });

    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout'); // stock changed on the storefront

    return NextResponse.json(
      {
        message: 'Order placed successfully',
        data: { ...serializeOrder(order), total: order.total },
      },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
