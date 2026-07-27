// src/app/api/search/popular/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/middlewares/error-handler';

/**
 * GET /api/search/popular
 * Public - the most-searched terms (min 2 hits so one-off typos never show).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const terms = await prisma.searchQuery.findMany({
      where: { count: { gte: 2 } },
      orderBy: [{ count: 'desc' }, { lastSearchedAt: 'desc' }],
      take: 6,
      select: { term: true, count: true },
    });
    return NextResponse.json({ message: 'Popular searches', data: terms });
  } catch (err) {
    return handleApiError(err);
  }
}
