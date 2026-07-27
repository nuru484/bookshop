// src/app/api/books/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError, ConflictError } from '@/middlewares/error-handler';
import { createBookSchema } from '@/validations/book-validation';
import { serializeBook } from '@/lib/serializers';
import { BOOKS_TAG } from '@/lib/catalog-data';
import { slugify, LOW_STOCK_THRESHOLD, type Genre, type BookStatus } from '@/data/catalog';
import type { Prisma } from '@/lib/prisma';

const SORTS: Record<string, keyof Prisma.BookOrderByWithRelationInput> = {
  title: 'title',
  price: 'price',
  stock: 'stock',
  sold: 'sold',
};

/**
 * GET /api/books
 * Protected (staff) - paginated catalogue with the table's filters.
 * ?page&limit&search&genre&stock=in|low|out&price=u100|100200|o200&sort&dir
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page') ?? '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '8') || 8, 1), 100);
    const search = sp.get('search')?.trim();
    const genre = sp.get('genre') ?? undefined;
    const stock = sp.get('stock') ?? undefined;
    const price = sp.get('price') ?? undefined;
    const bookStatus = sp.get('status') ?? undefined;
    const sort = SORTS[sp.get('sort') ?? ''] ?? 'sold';
    const dir = sp.get('dir') === 'asc' ? 'asc' : 'desc';

    const where: Prisma.BookWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (genre && genre !== 'All') where.genre = genre as Genre;
    if (bookStatus && bookStatus !== 'All') where.status = bookStatus as BookStatus;
    if (stock === 'out') where.stock = 0;
    else if (stock === 'low') where.stock = { gt: 0, lte: LOW_STOCK_THRESHOLD };
    else if (stock === 'in') where.stock = { gt: LOW_STOCK_THRESHOLD };
    if (price === 'u100') where.price = { lt: 100 };
    else if (price === '100200') where.price = { gte: 100, lte: 200 };
    else if (price === 'o200') where.price = { gt: 200 };

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy: { [sort]: dir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.book.count({ where }),
    ]);

    return NextResponse.json({
      message: 'Books retrieved successfully',
      data: books.map(serializeBook),
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/books
 * Protected (staff) - adds a title to the shelf; purges the storefront cache.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const body = await req.json();
    const validation = createBookSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }

    const input = validation.data;
    const baseSlug = slugify(input.title);
    const clash = await prisma.book.findUnique({ where: { slug: baseSlug }, select: { id: true } });
    if (clash) {
      throw new ConflictError(`A book titled "${input.title}" is already on the shelf`);
    }

    const book = await prisma.book.create({
      data: {
        slug: baseSlug,
        title: input.title,
        author: input.author,
        price: input.price,
        stock: input.stock,
        genre: input.genre,
        status: input.status ?? 'Published',
        year: input.year ?? new Date().getFullYear(),
        isbn: input.isbn || '',
        blurb: input.blurb || '',
        isNew: input.isNew ?? true,
        staffPick: input.staffPick ?? false,
      },
    });

    revalidateTag(BOOKS_TAG, 'max');
    revalidatePath('/', 'layout');

    return NextResponse.json(
      { message: `"${book.title}" is on the shelf`, data: serializeBook(book) },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
