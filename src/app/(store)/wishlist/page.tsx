// src/app/(store)/wishlist/page.tsx
import { pageMetadata } from '@/lib/seo';
import { WishlistClient } from '@/components/store/wishlist-client';

export const metadata = pageMetadata({
  title: 'Wishlist',
  description: 'Books you are circling but have not committed to yet.',
  path: '/wishlist',
  index: false,
});

export default function WishlistPage() {
  return <WishlistClient />;
}
