// src/hooks/use-hydrated.ts
'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * True only after hydration on the client. Gate UI that reads
 * localStorage-persisted redux state (basket count, wishlist hearts)
 * behind this to avoid SSR hydration mismatches.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
