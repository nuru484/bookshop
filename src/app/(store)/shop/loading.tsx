// src/app/(store)/shop/loading.tsx
import { BookGridSkeleton } from '@/components/ui/Skeleton';

export default function ShopLoading() {
  return (
    <section aria-busy="true" className="pt-10 pb-16">
      <div className="skeleton mb-5 h-10 w-48" />
      <div className="skeleton mb-[26px] h-9 w-full max-w-[520px]" />
      <BookGridSkeleton />
    </section>
  );
}
