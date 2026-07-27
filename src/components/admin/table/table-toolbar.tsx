// src/components/admin/table/table-toolbar.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

interface TableToolbarProps {
  /** The applied search term (from URL state). */
  searchValue: string;
  /** Called with the debounced term (empty string when cleared). */
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /**
   * Filter controls. Inline on the search row from lg up; below lg they lay
   * out as a two-per-row grid, so each control should be w-full lg:w-auto.
   */
  filterFields?: ReactNode;
  /**
   * Chip-style quick filters (e.g. order status chips). Rendered in a
   * horizontally scrollable row - never wraps on small screens.
   */
  chipRow?: ReactNode;
  hasFiltersApplied?: boolean;
  /** Count of active non-search filters - shown on the mobile Filters badge. */
  filterCount?: number;
  onClearAll?: () => void;
  /** Right-side actions (e.g. "+ Add a book", bulk delete). */
  actions?: ReactNode;
  /** Active-filter chips row, rendered under the controls. */
  chips?: ReactNode;
}

/**
 * Search + filters toolbar. The search input is long (grows to fill its row)
 * with an inline ✕ clear. On lg+ everything sits inline on the search row;
 * below lg the select/date filters collapse behind a "Filters" toggle (with
 * an active-count badge) while chip rows stay visible and scrollable. Owns
 * the search input locally and debounces upward (400ms); a lastEmitted ref
 * distinguishes its own commits from external resets so "Clear filters"
 * never fights with typing.
 */
export function TableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filterFields,
  chipRow,
  hasFiltersApplied = false,
  filterCount = 0,
  onClearAll,
  actions,
  chips,
}: TableToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(searchValue);
  const debounced = useDebounce(searchInput, 400);
  const lastEmitted = useRef(searchValue);

  useEffect(() => {
    if (debounced !== lastEmitted.current) {
      lastEmitted.current = debounced;
      onSearchChange(debounced);
    }
  }, [debounced, onSearchChange]);

  useEffect(() => {
    if (searchValue !== lastEmitted.current) {
      lastEmitted.current = searchValue;
      setSearchInput(searchValue);
    }
  }, [searchValue]);

  const clearSearch = () => {
    setSearchInput('');
    lastEmitted.current = '';
    onSearchChange('');
  };

  const clearButton = onClearAll && hasFiltersApplied && (
    <button
      type="button"
      onClick={onClearAll}
      className="flex h-11 shrink-0 cursor-pointer items-center border-none bg-transparent px-1.5 text-[12.5px] font-bold whitespace-nowrap text-pine underline hover:text-pine-deep"
    >
      Clear filters
    </button>
  );

  return (
    <div className="mb-3.5 flex flex-col gap-2.5">
      {/* Row 1: long search (+ inline filters and clear on lg) + actions.
          items-end so labeled controls (date fields) bottom-align their
          inputs with the unlabeled ones - every control is h-11. */}
      <div className="flex items-end gap-2.5">
        <div className="relative min-w-0 flex-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-glass box-border h-11 w-full px-3.5 pr-9 text-sm"
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[13px] font-bold text-sage hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
        {filterFields && (
          <div className="hidden shrink-0 items-end gap-2 lg:flex">{filterFields}</div>
        )}
        {clearButton && <span className="hidden shrink-0 items-end lg:flex">{clearButton}</span>}
        {actions && <div className="hidden h-11 shrink-0 items-center gap-2 lg:flex">{actions}</div>}
      </div>

      {/* Chip row: horizontally scrollable, never wraps, always visible */}
      {chipRow && (
        <div
          className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: 'thin' }}
        >
          {chipRow}
        </div>
      )}

      {/* Below lg: the Filters toggle and the page's action buttons share
          ONE row (side by side); flex-wrap is only the can't-fit fallback. */}
      {(filterFields || actions || clearButton) && (
        <div className="flex flex-wrap items-center gap-2 lg:hidden">
          {filterFields && (
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="flex h-11 shrink-0 cursor-pointer items-center gap-2 border border-ink/22 bg-white/55 px-3.5 text-[13px] font-bold text-ink"
            >
              Filters
              {filterCount > 0 && (
                <span className="flex h-[18px] min-w-[18px] items-center justify-center bg-pine px-1 text-[10.5px] font-bold text-cream-bright">
                  {filterCount}
                </span>
              )}
              <span className="text-[9px] text-sage">{showFilters ? '▲' : '▼'}</span>
            </button>
          )}
          {clearButton}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* The collapsible 2-per-row filter panel */}
      {filterFields && showFilters && (
        <div className="grid grid-cols-2 items-end gap-2 lg:hidden">{filterFields}</div>
      )}

      {chips}
    </div>
  );
}

/** Consistent select styling for toolbar filter controls - h-11 like every
 *  other toolbar control so rows align. */
export const toolbarSelectCls =
  'box-border h-11 w-full cursor-pointer border border-ink/22 bg-white/55 px-3 text-[13px] font-semibold text-ink outline-none lg:w-auto';
