// src/app/api/search/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { searchRatelimit } from '@/lib/rate-limit';
import { handleApiError, ValidationError, TooManyRequestsError } from '@/middlewares/error-handler';
import { z } from 'zod';

const logSchema = z.object({
  term: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .transform((v) => v.toLowerCase()),
});

/**
 * POST /api/search/log { term }
 * Public - records a committed search (Enter / result opened), powering the
 * "mostly searched by others" list. Aggregated by normalized term.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const { success } = await searchRatelimit.limit(`searchlog:${ip}`);
    if (!success) throw new TooManyRequestsError('Slow down a little.');

    const validation = logSchema.safeParse(await req.json());
    if (!validation.success) throw new ValidationError('Search term must be 2-60 characters');
    const { term } = validation.data;

    await prisma.searchQuery.upsert({
      where: { term },
      create: { term },
      update: { count: { increment: 1 }, lastSearchedAt: new Date() },
    });

    return NextResponse.json({ message: 'Logged' });
  } catch (err) {
    return handleApiError(err);
  }
}
