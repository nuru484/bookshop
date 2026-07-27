// src/components/admin/table/data-table.tsx
// Generic client-side data-table kit: useClientTable owns filtering/sorting/
// pagination over a local array; DataTable renders the Harmattan shell with a
// real table on md+ and dense row cards below md. Architecture mirrors the
// website-frontend kit; the data layer is client-side until the APIs land.
'use client';

import type { ReactNode } from 'react';
import { Fragment, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TableUrlState } from '@/hooks/use-table-url-state';

/* ── Empty-state semantics ─────────────────────────────────────────── */

export type TableEmptyMode = 'no-data' | 'filtered-empty' | null;

export function tableEmptyMode(
  rowCount: number,
  filtersActive: boolean,
): TableEmptyMode {
  if (rowCount > 0) return null;
  return filtersActive ? 'filtered-empty' : 'no-data';
}

/* ── Column model ──────────────────────────────────────────────────── */

export interface ColumnDef<T> {
  key: string;
  header: ReactNode;
  /** Flex sizing classes, e.g. "flex-[0_0_84px]" or "flex-[1_1_200px] min-w-0". */
  width: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Hide this column below a breakpoint (the row card carries the info instead). */
  hideBelow?: 'lg';
  cell: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  dir: 1 | -1;
}

/* ── useClientTable ────────────────────────────────────────────────── */

interface UseClientTableOptions<T> {
  data: T[];
  urlState: TableUrlState;
  searchFn: (row: T, q: string) => boolean;
  filterFn: (row: T, filters: Record<string, string | undefined>) => boolean;
  sortValue: (row: T, key: string) => string | number;
  defaultSort: SortState;
  sortState: SortState;
  onSortChange: (sort: SortState) => void;
}

export interface ClientTable<T> {
  /** Rows for the current page. */
  rows: T[];
  /** Rows after search+filters (all pages). */
  filteredRows: T[];
  filteredCount: number;
  totalCount: number;
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  emptyMode: TableEmptyMode;
  sort: SortState;
  toggleSort: (key: string) => void;
  arrow: (key: string) => string;
}

export function useClientTable<T>({
  data,
  urlState,
  searchFn,
  filterFn,
  sortValue,
  defaultSort,
  sortState,
  onSortChange,
}: UseClientTableOptions<T>): ClientTable<T> {
  const { search, filters, filtersActive, page, pageSize } = urlState;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = data.filter((row) => (!q || searchFn(row, q)) && filterFn(row, filters));
    return filtered.slice().sort((a, b) => {
      const av = sortValue(a, sortState.key);
      const bv = sortValue(b, sortState.key);
      const cmp = typeof av === 'string' ? av.localeCompare(String(bv)) : av - Number(bv);
      return cmp * sortState.dir;
    });
  }, [data, search, filters, sortState, searchFn, filterFn, sortValue]);

  const pageCount = Math.max(Math.ceil(filteredRows.length / pageSize), 1);
  const curPage = Math.min(page, pageCount);
  const rows = filteredRows.slice((curPage - 1) * pageSize, curPage * pageSize);

  const toggleSort = (key: string) =>
    onSortChange(
      sortState.key === key
        ? { key, dir: (-sortState.dir) as 1 | -1 }
        : { key, dir: defaultSort.key === key ? defaultSort.dir : 1 },
    );

  const arrow = (key: string) => (sortState.key === key ? (sortState.dir > 0 ? '↑' : '↓') : '');

  return {
    rows,
    filteredRows,
    filteredCount: filteredRows.length,
    totalCount: data.length,
    page: curPage,
    pageCount,
    rangeStart: filteredRows.length === 0 ? 0 : (curPage - 1) * pageSize + 1,
    rangeEnd: Math.min(curPage * pageSize, filteredRows.length),
    emptyMode: tableEmptyMode(filteredRows.length, filtersActive),
    sort: sortState,
    toggleSort,
    arrow,
  };
}

/* ── useServerTable ────────────────────────────────────────────────── */

export interface ServerTableMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UseServerTableOptions<T> {
  /** The current page of rows, as returned by the API. */
  rows: T[];
  /** Pagination meta from the API response (undefined while loading). */
  meta: ServerTableMeta | undefined;
  urlState: TableUrlState;
  defaultSort: SortState;
  sortState: SortState;
  onSortChange: (sort: SortState) => void;
}

/**
 * Adapter for API-driven tables: the server owns filtering/sorting/paging
 * (driven by query params from useTableUrlState); this just presents the
 * response in the ClientTable shape the DataTable shell expects.
 */
export function useServerTable<T>({
  rows,
  meta,
  urlState,
  defaultSort,
  sortState,
  onSortChange,
}: UseServerTableOptions<T>): ClientTable<T> {
  const { filtersActive, pageSize } = urlState;

  const total = meta?.total ?? rows.length;
  const page = meta?.page ?? urlState.page;
  const pageCount = meta?.totalPages ?? 1;
  const limit = meta?.limit ?? pageSize;

  const toggleSort = (key: string) =>
    onSortChange(
      sortState.key === key
        ? { key, dir: (-sortState.dir) as 1 | -1 }
        : { key, dir: defaultSort.key === key ? defaultSort.dir : 1 },
    );

  const arrow = (key: string) => (sortState.key === key ? (sortState.dir > 0 ? '↑' : '↓') : '');

  return {
    rows,
    filteredRows: rows,
    filteredCount: total,
    totalCount: total,
    page,
    pageCount,
    rangeStart: total === 0 ? 0 : (page - 1) * limit + 1,
    rangeEnd: Math.min(page * limit, total),
    emptyMode: tableEmptyMode(total, filtersActive),
    sort: sortState,
    toggleSort,
    arrow,
  };
}

/* ── Row card (mobile rendering) ───────────────────────────────────── */

export function RowCard({
  onOpen,
  leading,
  action,
  className,
  children,
}: {
  onOpen?: () => void;
  /** Left-edge control (e.g. a selection checkbox); clicks don't open the row. */
  leading?: ReactNode;
  /** Right-edge control (e.g. actions); clicks don't open the row. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li
      onClick={onOpen}
      className={cn(
        'flex items-center gap-2.5 border-b border-pale px-3 py-3 last:border-0',
        onOpen && 'cursor-pointer active:bg-pine/7',
        className,
      )}
    >
      {leading && (
        <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center">
          {leading}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
      {action && (
        <span onClick={(e) => e.stopPropagation()} className="flex shrink-0 items-center">
          {action}
        </span>
      )}
    </li>
  );
}

/**
 * The one row-card anatomy every table uses on phones, so lists read
 * uniformly: fixed visual slot, two truncating text lines, right-aligned
 * value + badge column. Nothing wraps.
 */
export function RowCardBody({
  visual,
  title,
  meta,
  value,
  badge,
}: {
  /** Fixed-size leading visual (cover thumb / avatar). */
  visual?: ReactNode;
  /** Line 1 - bold, truncates. */
  title: ReactNode;
  /** Line 2 - muted meta, truncates. */
  meta: ReactNode;
  /** Right column top - the primary value (price/total/spent). */
  value?: ReactNode;
  /** Right column bottom - a status/stock pill. */
  badge?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {visual && <span className="flex shrink-0 items-center">{visual}</span>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-ink">{title}</div>
        <div className="mt-0.5 truncate text-xs text-sage">{meta}</div>
      </div>
      {(value || badge) && (
        <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-1 text-right">
          {value && <span className="text-[13px] font-bold whitespace-nowrap text-ink">{value}</span>}
          {badge}
        </div>
      )}
    </div>
  );
}

/* ── DataTable shell ───────────────────────────────────────────────── */

const ALIGN: Record<NonNullable<ColumnDef<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  table: ClientTable<T>;
  rowKey: (row: T) => string | number;
  onRowOpen?: (row: T) => void;
  /** Optional leading column (e.g. select-all checkbox + row checkboxes). */
  leading?: { header: ReactNode; cell: (row: T) => ReactNode };
  /** One dense RowCard per row - the below-md rendering. */
  renderRowCard: (row: T) => ReactNode;
  toolbar?: ReactNode;
  pagination?: ReactNode;
  /** Rendered ALONE when there is no data at all (no toolbar, no table). */
  emptyState: ReactNode;
  /** Plural label for the filtered-empty copy, e.g. "orders". */
  entityLabel: string;
  onClearFilters: () => void;
  minWidth?: number;
  /** Extra classes for a desktop row (e.g. dim inactive records). */
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  table,
  rowKey,
  onRowOpen,
  leading,
  renderRowCard,
  toolbar,
  pagination,
  emptyState,
  entityLabel,
  onClearFilters,
  minWidth = 860,
  rowClassName,
}: DataTableProps<T>) {
  if (table.emptyMode === 'no-data') {
    return <div className="w-full">{emptyState}</div>;
  }

  const filteredEmpty = (
    <div className="px-5 py-12 text-center">
      <div className="mb-2 font-serif text-xl text-ink">No matching {entityLabel}.</div>
      <p className="m-0 mb-4 text-[13px] text-sage">
        Nothing fits the current search and filters - try clearing them.
      </p>
      <button type="button" onClick={onClearFilters} className="btn-dark px-5 py-2.5 text-[13px]">
        Clear filters
      </button>
    </div>
  );

  return (
    <div className="w-full">
      {toolbar}

      <div className="glass overflow-hidden">
        {/* md+ table */}
        <div className="hidden overflow-x-auto md:block">
          <div
            className="flex items-center gap-3.5 border-b border-ink/14 bg-cream/65 px-4 py-3 text-[11px] font-bold tracking-[0.1em] text-sage uppercase"
            style={{ minWidth }}
          >
            {leading && <span className="flex shrink-0 items-center">{leading.header}</span>}
            {columns.map((col) => (
              <span
                key={col.key}
                className={cn(
                  col.width,
                  ALIGN[col.align ?? 'left'],
                  col.hideBelow === 'lg' && 'hidden lg:block',
                )}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => table.toggleSort(col.key)}
                    className={cn(
                      'cursor-pointer border-none bg-transparent p-0 text-[11px] font-bold tracking-[0.1em] text-sage uppercase hover:text-pine',
                      ALIGN[col.align ?? 'left'],
                    )}
                  >
                    {col.header} {table.arrow(col.key)}
                  </button>
                ) : (
                  col.header
                )}
              </span>
            ))}
          </div>

          {table.emptyMode === 'filtered-empty'
            ? filteredEmpty
            : table.rows.map((row) => (
                <div
                  key={rowKey(row)}
                  onClick={onRowOpen ? () => onRowOpen(row) : undefined}
                  className={cn(
                    'flex items-center gap-3.5 border-b border-pale px-4 py-2.5 last:border-0',
                    onRowOpen && 'cursor-pointer hover:bg-pine/7',
                    rowClassName?.(row),
                  )}
                  style={{ minWidth }}
                >
                  {leading && (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="flex shrink-0 items-center"
                    >
                      {leading.cell(row)}
                    </span>
                  )}
                  {columns.map((col) => (
                    <span
                      key={col.key}
                      className={cn(
                        col.width,
                        ALIGN[col.align ?? 'left'],
                        col.hideBelow === 'lg' && 'hidden lg:block',
                      )}
                    >
                      {col.cell(row)}
                    </span>
                  ))}
                </div>
              ))}
        </div>

        {/* below-md row cards */}
        <ul role="list" className="m-0 list-none p-0 md:hidden">
          {table.emptyMode === 'filtered-empty'
            ? filteredEmpty
            : table.rows.map((row) => (
                <Fragment key={rowKey(row)}>{renderRowCard(row)}</Fragment>
              ))}
        </ul>
      </div>

      {table.emptyMode !== 'filtered-empty' && pagination}
    </div>
  );
}
