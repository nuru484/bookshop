// src/app/(store)/books/[slug]/page.tsx
import type { Metadata } from 'next';
import { BOOKS } from '@/data/catalog';
import { getBookBySlugCached, getBooksCached } from '@/lib/catalog-data';
import { pageMetadata } from '@/lib/seo';
import { BookDetailClient } from '@/components/store/book-detail-client';

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const books = await getBooksCached();
    return books.map((book) => ({ slug: book.slug }));
  } catch {
    return BOOKS.map((book) => ({ slug: book.slug }));
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;

  let book;
  try {
    book = await getBookBySlugCached(slug);
  } catch {
    book = BOOKS.find((b) => b.slug === slug);
  }

  // Unknown slugs (e.g. books added moments ago through the admin console)
  // fall back to a slug-derived title instead of failing the page.
  const fallbackTitle = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return pageMetadata({
    title: book ? book.title : fallbackTitle,
    description: book
      ? `${book.blurb} By ${book.author}. ${book.pages} pages, paperback.`
      : 'A title from the Harmattan Books shelves, delivered anywhere in Ghana.',
    path: `/books/${slug}`,
    keywords: book ? [book.title, book.author, book.genre] : undefined,
  });
}

export default async function BookDetailPage({ params }: Params) {
  const { slug } = await params;
  return <BookDetailClient slug={slug} />;
}
