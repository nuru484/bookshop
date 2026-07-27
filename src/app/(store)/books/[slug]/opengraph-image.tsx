import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { getBookBySlugCached } from '@/lib/catalog-data';

export const alt = 'Harmattan Books - independent booksellers in Tamale';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Per-book OG card. Falls back to a generic branded card when the title is
 * unknown or the database is unreachable, so a share never fails.
 */
export default async function BookOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let book: Awaited<ReturnType<typeof getBookBySlugCached>>;
  try {
    book = await getBookBySlugCached(slug);
  } catch {
    book = undefined;
  }

  return brandOgImage({
    eyebrow: book ? `${book.genre} · ${book.author}` : 'The Shop · Every shelf',
    title: book?.title ?? 'A shelf worth browsing.',
    // "GHS" rather than the cedi sign: Satori's default font has no glyph
    // for U+20B5, which would render as a tofu box on the card.
    subtitle: book
      ? `GHS ${book.price} · ${book.pages} pages · delivered anywhere in Ghana.`
      : 'Hand-picked classics, kept in print and in stock.',
    cta: book ? 'Order it at harmattanbooks.com →' : undefined,
  });
}
