// src/app/(store)/wishlist/loading.tsx
import { BookGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function WishlistLoading() {
  return (
    <section aria-busy="true" className="pt-10 pb-16">
      <Skeleton className="mb-1.5 h-10 w-44" />
      <Skeleton className="mb-[26px] h-3 w-64" />
      <BookGridSkeleton count={4} />
    </section>
  );
}
