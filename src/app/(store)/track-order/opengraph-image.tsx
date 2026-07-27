import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Track a Harmattan Books order';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TrackOrderOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Order tracking',
    title: 'Where are my books?',
    subtitle: 'Enter your order number and the email or phone you used at checkout.',
    cta: 'Track your order at harmattanbooks.com →',
  });
}
