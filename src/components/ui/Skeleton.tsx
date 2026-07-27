// src/components/ui/Skeleton.tsx
import { cn } from '@/lib/utils';

/**
 * Shimmer placeholder block. `aria-hidden` by design - the container that
 * composes skeletons should announce `aria-busy="true"`.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('skeleton', className)} {...props} />;
}

/** Book-card shaped skeleton (cover + two text lines + price row). */
export function BookCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)} aria-hidden="true">
      <Skeleton className="aspect-2/3 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-7 w-14" />
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-[22px]"
    >
      {Array.from({ length: count }, (_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

const ROW_WIDTHS = ['w-3/5', 'w-2/5', 'w-4/5', 'w-1/2', 'w-3/4', 'w-2/3'];

/** Table-shaped skeleton for the admin lists (header + varied rows). */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="glass overflow-hidden" aria-busy="true">
      <div className="border-b border-ink/15 bg-cream/65 px-4 py-3">
        <Skeleton className="h-3 w-56" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-pale px-4 py-3.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className={cn('h-4', ROW_WIDTHS[i % ROW_WIDTHS.length])} />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Stat-card grid skeleton for the admin dashboard. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      aria-busy="true"
      className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="glass p-5">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}
