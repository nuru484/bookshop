import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'The Harmattan Books shop - classics in stock in Tamale';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function ShopOpengraphImage() {
  return brandOgImage({
    eyebrow: 'The Shop · Every shelf',
    title: 'The whole shelf.',
    subtitle: 'Romance, Gothic, Literary, Adventure and Epic - in stock and ready to ship.',
    cta: 'Shop the shelves at harmattanbooks.com →',
  });
}
