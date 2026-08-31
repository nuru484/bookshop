// src/app/(store)/authors/[name]/page.tsx
import type { Metadata } from 'next';
import { BOOKS, type Book } from '@/data/catalog';
import { getBooksCached } from '@/lib/catalog-data';
import { pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';
import { AuthorClient } from '@/components/store/author-client';

interface Params {
  params: Promise<{ name: string }>;
}

/** Published catalogue, falling back to the seed list when the DB is absent. */
const catalogue = async (): Promise<Book[]> => {
  try {
    return await getBooksCached();
  } catch {
    return BOOKS;
  }
};

export async function generateStaticParams() {
  const books = await catalogue();
  return [...new Set(books.map((b) => b.author))].map((author) => ({ name: author }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { name } = await params;
  const author = decodeURIComponent(name);
  const books = await catalogue();
  const count = books.filter((b) => b.author === author).length;

  return pageMetadata({
    title: `${author} - Author collection`,
    description:
      count > 0
        ? `${count} ${count === 1 ? 'title' : 'titles'} by ${author}, in stock at ${siteConfig.name} and delivered anywhere in ${siteConfig.country}.`
        : `Titles by ${author} at ${siteConfig.name}.`,
    path: `/authors/${encodeURIComponent(author)}`,
    keywords: [author],
  });
}

export default async function AuthorPage({ params }: Params) {
  const { name } = await params;
  return <AuthorClient name={decodeURIComponent(name)} />;
}
