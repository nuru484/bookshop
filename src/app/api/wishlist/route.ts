// src/app/api/wishlist/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { handleApiError, ValidationError } from '@/middlewares/error-handler';
import { z } from 'zod';

const toggleSchema = z.object({ bookId: z.number().int().positive() });
const mergeSchema = z.object({ bookIds: z.array(z.number().int().positive()).max(200) });

const listIds = async (userId: string): Promise<number[]> => {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { bookId: true },
    orderBy: { createdAt: 'asc' },
  });
  return items.map((i) => i.bookId);
};

/** GET /api/wishlist - the signed-in user's wishlist book ids. */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    return NextResponse.json({
      message: 'Wishlist retrieved successfully',
      data: await listIds(session.userId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/wishlist { bookId } - toggles one book; returns the new list. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const validation = toggleSchema.safeParse(await req.json());
    if (!validation.success) throw new ValidationError('A bookId is required');
    const { bookId } = validation.data;

    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_bookId: { userId: session.userId, bookId } },
    });
    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
    } else {
      await prisma.wishlistItem.create({ data: { userId: session.userId, bookId } });
    }

    return NextResponse.json({
      message: existing ? 'Removed from wishlist' : 'Saved to your wishlist',
      data: await listIds(session.userId),
      added: !existing,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * PUT /api/wishlist { bookIds } - merges guest wishlist items into the
 * account (used right after sign-in); returns the combined list.
 */
export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const validation = mergeSchema.safeParse(await req.json());
    if (!validation.success) throw new ValidationError('bookIds must be an array');

    const valid = await prisma.book.findMany({
      where: { id: { in: validation.data.bookIds } },
      select: { id: true },
    });
    await prisma.wishlistItem.createMany({
      data: valid.map((b) => ({ userId: session.userId, bookId: b.id })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: 'Wishlist merged',
      data: await listIds(session.userId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
