// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';
import { getBooksCached } from '@/lib/catalog-data';
import { BOOKS } from '@/data/catalog';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  let books;
  try {
    books = await getBooksCached();
  } catch {
    // DB unavailable at build time - ship the seed list instead of failing.
    books = BOOKS;
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/search`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/track-order`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const bookPages: MetadataRoute.Sitemap = books.map((book) => ({
    url: `${siteUrl}/books/${book.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const authorPages: MetadataRoute.Sitemap = [...new Set(books.map((b) => b.author))].map(
    (author) => ({
      url: `${siteUrl}/authors/${encodeURIComponent(author)}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    }),
  );

  return [...staticPages, ...bookPages, ...authorPages];
}
