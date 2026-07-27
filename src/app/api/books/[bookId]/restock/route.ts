// src/app/api/books/[bookId]/restock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError, NotFoundError } from '@/middlewares/error-handler';
import { restockSchema } from '@/validations/book-validation';
import { serializeBook } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';

/**
 * PATCH /api/books/[bookId]/restock
 * Protected (staff) - adds copies (default 20) to a title's stock.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const id = parseInt((await params).bookId, 10);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid book id');

    const body = await req.json().catch(() => ({}));
    const validation = restockSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Restock quantity must be between 1 and 500');
    }

    const existing = await prisma.book.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundError('Book not found');

    const book = await prisma.book.update({
      where: { id },
      data: { stock: { increment: validation.data.qty } },
    });
    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout');

    return NextResponse.json({
      message: `Ordered ${validation.data.qty} more copies of "${book.title}"`,
      data: serializeBook(book),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
