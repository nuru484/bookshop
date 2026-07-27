import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Harmattan Books terms of service';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TermsOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Terms of service',
    title: 'How we trade.',
    subtitle: 'Ordering, delivery, payment and refunds at Harmattan Books.',
    cta: 'Read the terms at harmattanbooks.com →',
  });
}
