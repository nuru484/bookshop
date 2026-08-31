import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';
import { siteConfig } from '@/lib/site';

export const alt = `${siteConfig.name} privacy policy`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function PrivacyOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Privacy policy',
    title: 'What we keep, and why.',
    subtitle: `How ${siteConfig.name} handles your account, orders and contact details.`,
    cta: `Read the full policy at ${siteConfig.domain} →`,
  });
}
