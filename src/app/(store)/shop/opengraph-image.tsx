import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { siteConfig } from '@/lib/site';

export const alt = `The ${siteConfig.name} shop - classics in stock in ${siteConfig.city}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function ShopOpengraphImage() {
  return brandOgImage({
    eyebrow: 'The Shop · Every shelf',
    title: 'The whole shelf.',
    subtitle: 'Romance, Gothic, Literary, Adventure and Epic - in stock and ready to ship.',
    cta: `Shop the shelves at ${siteConfig.domain} →`,
  });
}
