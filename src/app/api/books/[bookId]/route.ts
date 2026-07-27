// src/app/api/books/[bookId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin, requireStaff } from '@/utils/require-admin';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@/middlewares/error-handler';
import { updateBookSchema } from '@/validations/book-validation';
import { serializeBook } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';
import { slugify } from '@/data/catalog';

const parseId = (raw: string): number => {
  const id = parseInt(raw, 10);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Invalid book id');
  return id;
};

/**
 * GET /api/books/[bookId]
 * Protected (staff) - one book plus the orders containing it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);
    const id = parseId((await params).bookId);

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: { order: true },
          orderBy: { order: { createdAt: 'desc' } },
        },
      },
    });
    if (!book) throw new NotFoundError('Book not found');

    return NextResponse.json({
      message: 'Book retrieved successfully',
      data: {
        ...serializeBook(book),
        ordersWith: book.orderItems.map((item) => ({
          id: item.order.id,
          name: item.order.name,
          date: item.order.createdAt.toISOString(),
          qty: item.qty,
          status: item.order.status,
        })),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/books/[bookId]
 * Protected (staff) - updates a title; purges the storefront cache.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);
    const id = parseId((await params).bookId);

    const body = await req.json();
    const validation = updateBookSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }

    const existing = await prisma.book.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!existing) throw new NotFoundError('Book not found');

    const input = validation.data;
    const data: Record<string, unknown> = { ...input };
    if (input.isbn === '') data.isbn = '';
    if (input.blurb === '') data.blurb = '';
    if (input.title && input.title !== existing.title) {
      const slug = slugify(input.title);
      const clash = await prisma.book.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true },
      });
      if (clash) throw new ConflictError(`A book titled "${input.title}" is already on the shelf`);
      data.slug = slug;
    }

    const book = await prisma.book.update({ where: { id }, data });
    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout');

    return NextResponse.json({
      message: `"${book.title}" updated`,
      data: serializeBook(book),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/books/[bookId]
 * Protected (admin) - removes a title. Books referenced by orders cannot be
 * hard-deleted (relation is Restrict); the API reports that clearly.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);
    const id = parseId((await params).bookId);

    const existing = await prisma.book.findUnique({
      where: { id },
      select: { title: true, _count: { select: { orderItems: true } } },
    });
    if (!existing) throw new NotFoundError('Book not found');
    if (existing._count.orderItems > 0) {
      throw new ConflictError(
        `"${existing.title}" appears in ${existing._count.orderItems} order(s) and can't be deleted. Set its stock to 0 instead.`,
      );
    }

    await prisma.book.delete({ where: { id } });
    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout');

    return NextResponse.json({ message: `"${existing.title}" removed from the shelf` });
  } catch (err) {
    return handleApiError(err);
  }
}
