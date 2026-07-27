// src/app/api/orders/mine/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { handleApiError, NotFoundError, ValidationError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';

/**
 * GET /api/orders/mine/[orderId]
 * Protected - one of the signed-in customer's own orders, with full lines
 * (titles, authors, covers via isbn) for the account order-detail page.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const { orderId } = await params;
    if (!orderId) throw new ValidationError('Order ID is required');

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true },
    });

    const order = await prisma.order.findFirst({
      where: {
        id: orderId.toUpperCase(),
        OR: [{ userId: session.userId }, ...(user ? [{ email: user.email }] : [])],
      },
      include: { items: { include: { book: true } } },
    });
    if (!order) throw new NotFoundError('Order not found');

    return NextResponse.json({
      message: 'Order retrieved successfully',
      data: {
        ...serializeOrder(order),
        total: order.total,
        lines: order.items.map((item) => ({
          bookId: item.bookId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          title: item.book.title,
          author: item.book.author,
          genre: item.book.genre,
          isbn: item.book.isbn,
        })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
