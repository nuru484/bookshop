// src/components/ui/ErrorState.tsx
'use client';

import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Inline, retryable failure card - the standard rendering for a query that
 * errored. Full-page failures use SystemMessage instead.
 */
export function ErrorState({
  title = "Couldn't load this",
  description = 'Something went wrong on our side. It usually passes - try again.',
  onRetry,
  retryLabel = '↻ Try again',
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('glass-dashed px-5 py-[46px] text-center', className)}>
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center bg-rust-pale text-lg font-bold text-rust">
        !
      </div>
      <div className="mb-2 font-serif text-2xl text-ink">{title}</div>
      <p className="mx-auto mb-[18px] max-w-[44ch] text-sm text-sage">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-dark px-6 py-3 text-sm">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
