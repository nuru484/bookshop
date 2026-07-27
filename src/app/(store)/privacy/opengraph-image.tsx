import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Harmattan Books privacy policy';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function PrivacyOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Privacy policy',
    title: 'What we keep, and why.',
    subtitle: 'How Harmattan Books handles your account, orders and contact details.',
    cta: 'Read the full policy at harmattanbooks.com →',
  });
}
