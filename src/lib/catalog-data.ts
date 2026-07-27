// src/lib/catalog-data.ts
// Server-side cached reads for the public storefront. Tag-based: admin book
// mutations call revalidateTag(BOOKS_TAG) so the storefront re-renders with
// fresh data on the next request.
import 'server-only';
import { unstable_cache } from 'next/cache';
import prisma from './prisma';
import { serializeBook } from './serializers';
import type { Book } from '@/data/catalog';

export const BOOKS_TAG = 'books';

export const getBooksCached = unstable_cache(
  async (): Promise<Book[]> => {
    const books = await prisma.book.findMany({ where: { status: 'Published' }, orderBy: { id: 'asc' } });
    return books.map(serializeBook);
  },
  ['catalog-books'],
  // Cached indefinitely in practice - admin mutations purge BOOKS_TAG.
  { tags: [BOOKS_TAG], revalidate: 60 * 60 * 24 * 30 },
);

export const getBookBySlugCached = async (slug: string): Promise<Book | undefined> => {
  const books = await getBooksCached();
  return books.find((b) => b.slug === slug);
};
