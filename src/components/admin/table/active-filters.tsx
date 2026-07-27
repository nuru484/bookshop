// src/components/admin/table/active-filters.tsx
'use client';

import type { ReactNode } from 'react';

export function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 border border-pine/40 bg-pine/8 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-pine-deep">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="cursor-pointer border-none bg-transparent p-0 text-[11px] font-bold text-pine hover:text-rust"
      >
        ✕
      </button>
    </span>
  );
}

export interface FilterChipDescriptor {
  key: string;
  label: ReactNode;
  onRemove: () => void;
}

/**
 * Descriptor-driven chips row - entity clients pass a small array instead of
 * hand-rolling conditional chip JSX. Chips with no active value are simply
 * omitted from the array by the caller.
 */
export function ActiveFilterChips({ items }: { items: FilterChipDescriptor[] }) {
  return (
    <ActiveFilters show={items.length > 0}>
      {items.map((item) => (
        <FilterChip key={item.key} onRemove={item.onRemove}>
          {item.label}
        </FilterChip>
      ))}
    </ActiveFilters>
  );
}

export function ActiveFilters({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <div
      className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5"
      style={{ scrollbarWidth: 'thin' }}
    >
      <span className="shrink-0 text-[11px] font-bold tracking-[0.1em] whitespace-nowrap text-sage uppercase">
        Active filters:
      </span>
      {children}
    </div>
  );
}
