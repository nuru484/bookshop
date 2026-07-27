// src/app/api/books/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { handleApiError } from '@/middlewares/error-handler';
import { serializeBook } from '@/lib/serializers';

/**
 * GET /api/books/search?q=
 * Public - published titles matching title or author, ranked: title
 * starts-with first, then title contains, then author matches, popular first
 * within each band.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (q.length < 2) {
      return NextResponse.json({ message: 'Type at least 2 characters', data: [] });
    }

    const matches = await prisma.book.findMany({
      where: {
        status: 'Published',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { author: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { sold: 'desc' },
      take: 24,
    });

    const lower = q.toLowerCase();
    const rank = (b: (typeof matches)[number]): number => {
      const title = b.title.toLowerCase();
      if (title.startsWith(lower)) return 0;
      if (title.includes(lower)) return 1;
      return 2;
    };
    matches.sort((a, b) => rank(a) - rank(b) || b.sold - a.sold);

    return NextResponse.json({
      message: `${matches.length} result${matches.length === 1 ? '' : 's'}`,
      data: matches.map(serializeBook),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
