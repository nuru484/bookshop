// src/app/(store)/books/[slug]/loading.tsx
import { Skeleton } from '@/components/ui/Skeleton';

export default function BookDetailLoading() {
  return (
    <section aria-busy="true" className="pt-8 pb-16">
      <Skeleton className="mb-[26px] h-4 w-36" />
      <div className="flex flex-wrap gap-11">
        <div className="min-w-[240px] flex-[0_1_300px]">
          <Skeleton className="aspect-2/3 w-full" />
        </div>
        <div className="min-w-[280px] flex-[1_1_380px]">
          <Skeleton className="mb-3 h-3 w-32" />
          <Skeleton className="mb-3 h-10 w-3/4" />
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="mb-4 h-4 w-56" />
          <Skeleton className="mb-5 h-8 w-32" />
          <Skeleton className="mb-2 h-4 w-full max-w-[56ch]" />
          <Skeleton className="mb-2 h-4 w-full max-w-[48ch]" />
          <Skeleton className="mb-6 h-4 w-2/3 max-w-[40ch]" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
      </div>
    </section>
  );
}
