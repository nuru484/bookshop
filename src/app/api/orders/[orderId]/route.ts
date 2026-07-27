// src/app/api/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError, NotFoundError, ValidationError } from '@/middlewares/error-handler';
import { serializeOrder } from '@/lib/serializers';

/**
 * GET /api/orders/[orderId]
 * Protected (staff) - full order detail with line titles.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const { orderId } = await params;
    if (!orderId) throw new ValidationError('Order ID is required');

    const order = await prisma.order.findUnique({
      where: { id: orderId.toUpperCase() },
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
