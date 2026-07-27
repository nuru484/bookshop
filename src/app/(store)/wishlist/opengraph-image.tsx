import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Your Harmattan Books wishlist';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function WishlistOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Wishlist',
    title: 'Books worth circling.',
    subtitle: 'Keep the titles you are not ready to commit to, saved for later.',
    cta: 'Start a wishlist at harmattanbooks.com →',
  });
}
