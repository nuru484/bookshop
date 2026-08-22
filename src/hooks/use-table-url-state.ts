// src/hooks/use-table-url-state.ts
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type TableFilters = Record<string, string | undefined>;

interface UseTableUrlStateOptions {
  /** Filter keys this table owns (also become URL params). */
  filterKeys: readonly string[];
  defaultPageSize?: number;
}

export interface TableUrlState {
  search: string;
  setSearch: (value: string) => void;
  filters: TableFilters;
  /** Merge a patch; undefined removes a filter. Resets page to 1. */
  setFilters: (patch: TableFilters) => void;
  clearFilters: () => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  filtersActive: boolean;
}

/** Serializes table state the same way it appears in the URL. */
const serialize = (
  search: string,
  filters: TableFilters,
  page: number,
  filterKeys: readonly string[],
): string => {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search);
  filterKeys.forEach((key) => {
    const value = filters[key];
    if (value) params.set(key, value);
  });
  if (page > 1) params.set('page', String(page));
  return params.toString();
};

/**
 * Table state (search / filters / page) seeded from and mirrored to the URL
 * query string, with a sessionStorage fallback so leaving a list and coming
 * back lands on the page that was last read.
 *
 * Precedence: an explicit URL always wins; the saved state is only adopted
 * when the request carries none of this table's params.
 */
export function useTableUrlState({
  filterKeys,
  defaultPageSize = 8,
}: UseTableUrlStateOptions): TableUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearchState] = useState(() => searchParams.get('q') ?? '');
  const [filters, setFiltersState] = useState<TableFilters>(() => {
    const initial: TableFilters = {};
    filterKeys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) initial[key] = value;
    });
    return initial;
  });
  const [page, setPageState] = useState(() => {
    const p = parseInt(searchParams.get('page') ?? '1', 10);
    return Number.isFinite(p) && p > 1 ? p : 1;
  });
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const keysRef = useRef(filterKeys);
  const storageKey = `hb-table:${pathname}`;
  /**
   * Set while a restored state is still propagating: the mirror effect runs
   * once with the pre-restore defaults, and writing those would wipe the
   * saved state before the restore lands.
   */
  const pendingRestoreRef = useRef<string | null>(null);
  const restoreCheckedRef = useRef(false);

  // Restore on mount, only when the URL carries none of our params.
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;

    const hasExplicitParams = ['q', 'page', ...keysRef.current].some(
      (name) => searchParams.get(name) !== null,
    );
    if (hasExplicitParams) return;

    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {
      return; // storage unavailable (private mode) - nothing to restore
    }
    if (!saved) return;

    const savedParams = new URLSearchParams(saved);
    const savedSearch = savedParams.get('q') ?? '';
    const savedFilters: TableFilters = {};
    keysRef.current.forEach((key) => {
      const value = savedParams.get(key);
      if (value) savedFilters[key] = value;
    });
    const parsedPage = parseInt(savedParams.get('page') ?? '1', 10);
    const savedPage = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1;

    pendingRestoreRef.current = serialize(savedSearch, savedFilters, savedPage, keysRef.current);
    // sessionStorage only exists on the client, so the restore cannot happen
    // during render without diverging from the server-rendered markup. This
    // runs once, on mount, guarded by restoreCheckedRef.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchState(savedSearch);
    setFiltersState(savedFilters);
    setPageState(savedPage);
    // Mount-only: the bare-URL check and saved state are meaningful just once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror state to the URL (replace, no scroll) and remember it for the
  // next visit; a table sitting at its defaults has nothing worth saving.
  useEffect(() => {
    const serialized = serialize(search, filters, page, keysRef.current);

    if (pendingRestoreRef.current !== null) {
      if (serialized !== pendingRestoreRef.current) return;
      pendingRestoreRef.current = null;
    }

    const params = new URLSearchParams(window.location.search);
    ['q', 'page', ...keysRef.current].forEach((name) => params.delete(name));
    new URLSearchParams(serialized).forEach((value, name) => params.set(name, value));
    const query = params.toString();
    const target = query ? `${pathname}?${query}` : pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (target !== current) router.replace(target, { scroll: false });

    try {
      if (serialized) sessionStorage.setItem(storageKey, serialized);
      else sessionStorage.removeItem(storageKey);
    } catch {
      // Storage failures never matter enough to break the table.
    }
  }, [search, filters, page, pathname, router, storageKey]);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPageState(1);
  }, []);

  const setFilters = useCallback((patch: TableFilters) => {
    setFiltersState((cur) => {
      const next = { ...cur, ...patch };
      keysRef.current.forEach((key) => {
        if (!next[key]) delete next[key];
      });
      return next;
    });
    setPageState(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setSearchState('');
    setPageState(1);
  }, []);

  const setPage = useCallback((nextPage: number) => {
    setPageState(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  const filtersActive = useMemo(
    () => search.trim() !== '' || Object.values(filters).some((v) => v !== undefined && v !== ''),
    [search, filters],
  );

  return {
    search,
    setSearch,
    filters,
    setFilters,
    clearFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    filtersActive,
  };
}
