// src/components/admin/table/table-pagination.tsx
'use client';

import type { ClientTable } from './data-table';

export const PAGE_SIZE_OPTIONS = [8, 16, 32];

/**
 * Harmattan-styled pagination. A single compact row on mobile
 * ("1-8 of 42" · size select · ← →) that expands to the fuller labels
 * from sm up. Hidden entirely when the result set fits the smallest
 * page size.
 */
export function TablePagination<T>({
  table,
  pageSize,
  onPageChange,
  onPageSizeChange,
  entityLabel,
}: {
  table: ClientTable<T>;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  entityLabel: string;
}) {
  if (table.filteredCount <= PAGE_SIZE_OPTIONS[0]) return null;

  const btnCls =
    'input-glass shrink-0 cursor-pointer px-2.5 py-1.5 text-xs font-bold whitespace-nowrap hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 sm:py-2 sm:text-[13px]';

  return (
    <div className="mt-3.5 flex flex-nowrap items-center justify-between gap-2">
      <span className="min-w-0 truncate text-xs font-medium text-sage sm:text-[13px]">
        <span className="sm:hidden">
          {table.rangeStart}-{table.rangeEnd} of {table.filteredCount}
        </span>
        <span className="hidden sm:inline">
          Showing {table.rangeStart}-{table.rangeEnd} of {table.filteredCount} {entityLabel}
        </span>
      </span>

      <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
        <label className="hidden text-xs font-bold text-sage sm:block" htmlFor="table-page-size">
          Per page
        </label>
        <select
          id="table-page-size"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="shrink-0 cursor-pointer border border-ink/22 bg-white/55 px-1.5 py-[5px] text-xs font-semibold text-ink outline-none sm:px-2 sm:py-[7px] sm:text-[13px]"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(table.page - 1, 1))}
          disabled={table.page <= 1}
          aria-label="Previous page"
          className={btnCls}
        >
          <span className="sm:hidden">←</span>
          <span className="hidden sm:inline">← Prev</span>
        </button>
        <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-moss sm:text-[13px]">
          <span className="sm:hidden">
            {table.page}/{table.pageCount}
          </span>
          <span className="hidden sm:inline">
            Page {table.page} of {table.pageCount}
          </span>
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(table.page + 1, table.pageCount))}
          disabled={table.page >= table.pageCount}
          aria-label="Next page"
          className={btnCls}
        >
          <span className="sm:hidden">→</span>
          <span className="hidden sm:inline">Next →</span>
        </button>
      </div>
    </div>
  );
}
