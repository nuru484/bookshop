import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Search the Harmattan Books catalogue';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function SearchOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Find a book',
    title: 'Search the shelf.',
    subtitle: 'Look up any title or author in the shop, from Austen to Tolstoy.',
    cta: 'Start searching at harmattanbooks.com →',
  });
}
