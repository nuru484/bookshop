// src/app/(store)/shop/page.tsx
import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import { BookGridSkeleton } from '@/components/ui/Skeleton';
import { ShopClient } from '@/components/store/shop-client';

export const metadata = pageMetadata({
  title: 'The Shop',
  description:
    'Browse every classic on our shelves - Romance, Gothic, Literary, Adventure and Epic, all in stock and delivered anywhere in Ghana.',
  path: '/shop',
  keywords: ['buy classics online', 'book delivery Tamale'],
});

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <section aria-busy="true" className="pt-10 pb-16">
          <div className="skeleton mb-5 h-10 w-48" />
          <div className="skeleton mb-[26px] h-9 w-full max-w-[520px]" />
          <BookGridSkeleton />
        </section>
      }
    >
      <ShopClient />
    </Suspense>
  );
}
