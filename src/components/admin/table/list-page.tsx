// src/components/admin/table/list-page.tsx
// The one wrapper every server-table list page shares: header, first-load
// skeleton, inline retryable error, and the background-refetch dim. A new
// list page is columns + filters JSX + a row card - this frame is the rest.
'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ui/ErrorState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { refetchDim } from '../api-helpers';

export function ListPageFrame({
  header,
  isLoading,
  isFetching,
  isError,
  onRetry,
  errorTitle,
  skeletonRows = 8,
  children,
}: {
  header: ReactNode;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  onRetry: () => void;
  errorTitle: string;
  skeletonRows?: number;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="animate-fade-up">
        {header}
        <TableSkeleton rows={skeletonRows} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="animate-fade-up">
        {header}
        <ErrorState title={errorTitle} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className={cn('animate-fade-up', refetchDim(isFetching, isLoading))}>
      {header}
      {children}
    </div>
  );
}
