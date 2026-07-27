// src/hooks/use-mobile.ts
'use client';

import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

/**
 * True below 768px (matches the md: CSS breakpoint the admin shell uses).
 * SSR-safe: the server snapshot is false, so first paint renders the
 * desktop branch and swaps after hydration.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
