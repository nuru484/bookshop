import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { siteConfig } from '@/lib/site';

export const alt = `Track a ${siteConfig.name} order`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TrackOrderOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Order tracking',
    title: 'Where are my books?',
    subtitle: 'Enter your order number and the email or phone you used at checkout.',
    cta: `Track your order at ${siteConfig.domain} →`,
  });
}
