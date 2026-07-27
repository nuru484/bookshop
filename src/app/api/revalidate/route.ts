// src/app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import crypto from 'crypto';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { BOOKS_TAG } from '@/lib/catalog-data';

const KNOWN_TAGS = new Set([BOOKS_TAG]);

/** Timing-safe secret comparison; fails closed when no secret is configured. */
const authorized = (provided: string | null): boolean => {
  if (!ENV.REVALIDATE_SECRET || !provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(ENV.REVALIDATE_SECRET, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/**
 * POST /api/revalidate { tag? }
 * Purges the storefront cache for writes that bypass the API layer - the
 * seed script, a manual SQL fix, or another service touching the database.
 * Authenticated by the REVALIDATE_SECRET header (x-revalidate-secret).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req.headers.get('x-revalidate-secret'))) {
    logger.warn('Rejected revalidate request with a bad or missing secret');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { tag?: string };
  const tag = body.tag ?? BOOKS_TAG;
  if (!KNOWN_TAGS.has(tag)) {
    return NextResponse.json({ message: `Unknown cache tag "${tag}"` }, { status: 400 });
  }

  revalidateTag(tag, 'max');
  revalidatePath('/', 'layout');
  logger.info({ tag }, 'Cache purged via revalidate endpoint');

  return NextResponse.json({ message: `Purged "${tag}" and the storefront routes` });
}
