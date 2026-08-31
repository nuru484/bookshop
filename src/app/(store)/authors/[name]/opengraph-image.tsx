import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { siteConfig } from '@/lib/site';
import { getBooksCached } from '@/lib/catalog-data';

export const alt = `${siteConfig.name} - ${siteConfig.headline.toLowerCase()}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-author OG card, with the number of titles we stock. Falls back to the
 * author name alone when the database is unreachable.
 */
export default async function AuthorOpengraphImage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const author = decodeURIComponent(name);

  let count = 0;
  try {
    const books = await getBooksCached();
    count = books.filter((b) => b.author === author).length;
  } catch {
    count = 0;
  }

  return brandOgImage({
    eyebrow: 'Author collection',
    title: author,
    subtitle: count
      ? `${count} title${count === 1 ? '' : 's'} on our shelves, delivered anywhere in ${siteConfig.country}.`
      : `On our shelves, delivered anywhere in ${siteConfig.country}.`,
    cta: `See the collection at ${siteConfig.domain} →`,
  });
}
