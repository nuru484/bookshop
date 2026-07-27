// src/app/(store)/search/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <section aria-busy="true" className="mx-auto max-w-[820px] pt-10 pb-16">
      <Skeleton className="mb-5 h-10 w-56" />
      <Skeleton className="mb-2 h-[58px] w-full" />
      <Skeleton className="mb-6 h-3 w-64" />
      <Skeleton className="mb-3 h-3 w-40" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
    </section>
  );
}
