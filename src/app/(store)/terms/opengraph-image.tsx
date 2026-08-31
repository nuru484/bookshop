import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { siteConfig } from '@/lib/site';

export const alt = `${siteConfig.name} terms of service`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TermsOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Terms of service',
    title: 'How we trade.',
    subtitle: `Ordering, delivery, payment and refunds at ${siteConfig.name}.`,
    cta: `Read the terms at ${siteConfig.domain} →`,
  });
}
