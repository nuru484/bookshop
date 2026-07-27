// src/components/admin/books-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGetBooksQuery, useDeleteBookMutation, useUpdateBookMutation } from '@/redux/catalog-api';
import { useConfirm } from '@/hooks/use-confirm';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { notify } from '@/lib/notify';
import { extractApiError } from '@/utils/extract-api-error';
import { StockLevelPill } from '@/components/ui/StatusPill';
import { BookCover } from '@/components/ui/BookCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { GENRES, type Book, type BookStatus } from '@/data/catalog';
import { bookStatusPill, statusActions } from './book-status';
import {
  DataTable,
  RowCard,
  RowCardBody,
  useServerTable,
  type ColumnDef,
  type SortState,
} from './table/data-table';
import { PageHeader } from './page-header';
import { RowActionsMenu } from './table/row-actions-menu';
import { TableToolbar, toolbarSelectCls } from './table/table-toolbar';
import { ActiveFilterChips } from './table/active-filters';
import { TablePagination } from './table/table-pagination';
import { ListPageFrame } from './table/list-page';
import { SelectCheckbox, useRowSelection, MoneyCell, TitleWithSubtitle } from './table/cells';
import { dirParam } from './api-helpers';

const STOCK_LABELS: Record<string, string> = {
  in: 'In stock',
  low: 'Low stock',
  out: 'Out of stock',
};
const PRICE_LABELS: Record<string, string> = {
  u100: 'Under GH₵100',
  '100200': 'GH₵100-200',
  o200: 'Over GH₵200',
};

const DEFAULT_SORT: SortState = { key: 'sold', dir: -1 };

export default function BooksClient() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const urlState = useTableUrlState({ filterKeys: ['shelf', 'stock', 'price', 'status'] });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const { filters, setFilters, clearFilters, search, setSearch } = urlState;

  const { data, isLoading, isFetching, isError, refetch } = useGetBooksQuery({
    page: urlState.page,
    limit: urlState.pageSize,
    search: search || undefined,
    genre: filters.shelf,
    stock: filters.stock,
    price: filters.price,
    status: filters.status,
    sort: sort.key,
    dir: dirParam(sort.dir),
  });

  const [deleteBook] = useDeleteBookMutation();
  const [updateBook] = useUpdateBookMutation();

  const books = data?.data ?? [];
  const table = useServerTable<Book>({
    rows: books,
    meta: data?.meta,
    urlState,
    defaultSort: DEFAULT_SORT,
    sortState: sort,
    onSortChange: setSort,
  });

  const selection = useRowSelection<number>(books.map((b) => b.id));
  const { sel } = selection;

  const filterCount = ['shelf', 'stock', 'price', 'status'].filter((k) => filters[k]).length;

  const onBulkDelete = () =>
    confirm({
      title: `Delete ${sel.length} title${sel.length === 1 ? '' : 's'}?`,
      description:
        'They will disappear from the storefront and this console. Titles that appear in orders cannot be deleted and will be skipped.',
      confirmText: `Delete ${sel.length} title${sel.length === 1 ? '' : 's'}`,
      isDestructive: true,
      onConfirm: async () => {
        const results = await Promise.allSettled(sel.map((id) => deleteBook(id).unwrap()));
        const removed = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected');
        selection.clear();
        if (failed.length === 0) {
          notify(`${removed} title${removed === 1 ? '' : 's'} removed.`);
        } else {
          const firstError = extractApiError((failed[0] as PromiseRejectedResult).reason).message;
          notify(
            removed > 0
              ? `${removed} removed, ${failed.length} skipped: ${firstError}`
              : firstError,
          );
        }
      },
    });

  const onDelete = (book: Book) =>
    confirm({
      title: `Remove "${book.title}" from the shelf?`,
      description:
        'The book will disappear from the storefront and this console. This cannot be undone.',
      confirmText: 'Remove book',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await deleteBook(book.id).unwrap();
          notify(res.message);
          selection.remove(book.id);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  const onChangeStatus = (book: Book, status: BookStatus) =>
    confirm({
      title:
        status === 'Published'
          ? `Publish "${book.title}"?`
          : status === 'Draft'
            ? `Move "${book.title}" to draft?`
            : `Archive "${book.title}"?`,
      description:
        status === 'Published'
          ? 'It will appear on the storefront again.'
          : 'It will disappear from the storefront until published again.',
      confirmText: status === 'Published' ? 'Publish' : status === 'Draft' ? 'Move to draft' : 'Archive',
      onConfirm: async () => {
        try {
          const res = await updateBook({ id: book.id, body: { status } }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  const menuActions = (b: Book, includeEdit: boolean) => [
    ...(includeEdit ? [{ label: 'Edit', onSelect: () => router.push(`/admin/books/${b.id}/edit`) }] : []),
    ...statusActions(b.status).map((a) => ({
      label: a.label,
      onSelect: () => onChangeStatus(b, a.status),
    })),
    { label: 'Remove book', destructive: true, onSelect: () => onDelete(b) },
  ];

  const columns: ColumnDef<Book>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      width: 'flex-[1_1_220px] min-w-0',
      cell: (b) => (
        <span className="flex min-w-0 items-center gap-3">
          <BookCover book={b} size="M" fallback="tiny" showAuthor={false} className="w-[30px] flex-none" />
          <TitleWithSubtitle
            title={b.title}
            subtitle={b.author}
            onOpen={() => router.push(`/admin/books/${b.id}`)}
          />
        </span>
      ),
    },
    {
      key: 'shelf',
      header: 'Shelf',
      width: 'flex-[0_0_84px]',
      hideBelow: 'lg',
      cell: (b) => <span className="text-[12.5px] font-medium text-moss">{b.genre}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      width: 'flex-[0_0_96px]',
      hideBelow: 'lg',
      cell: (b) => bookStatusPill(b.status),
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_84px]',
      cell: (b) => <MoneyCell amount={b.price} className="font-semibold" />,
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_90px]',
      cell: (b) => <StockLevelPill stock={b.stock} />,
    },
    {
      key: 'sold',
      header: 'Sold',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_66px]',
      cell: (b) => <span className="text-[13px] font-semibold text-moss">{b.sold}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      width: 'flex-[0_0_116px]',
      cell: (b) => (
        <span className="flex justify-end gap-1.5 text-right">
          <Link
            href={`/admin/books/${b.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="border border-mist px-3 py-1.5 text-center text-xs font-bold text-ink no-underline hover:border-pine hover:text-pine hover:no-underline"
          >
            Edit
          </Link>
          <RowActionsMenu label={b.title} actions={menuActions(b, false)} />
        </span>
      ),
    },
  ];

  const header = (
    <PageHeader
      title={
        <>
          Books{' '}
          {data && (
            <span className="font-sans text-sm font-medium text-sage">{data.meta.total} titles</span>
          )}
        </>
      }
      subtitle="The full catalogue - stock, pricing and sales at a glance."
    />
  );

  return (
    <ListPageFrame
      header={header}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRetry={() => void refetch()}
      errorTitle="Couldn't load the catalogue"
      skeletonRows={urlState.pageSize}
    >
      <DataTable<Book>
        columns={columns}
        table={table}
        rowKey={(b) => b.id}
        leading={{
          header: (
            <SelectCheckbox
              checked={selection.allSelected}
              onChange={selection.toggleAll}
              label="Select all on this page"
            />
          ),
          cell: (b) => (
            <SelectCheckbox
              checked={sel.includes(b.id)}
              onChange={() => selection.toggleOne(b.id)}
              label={`Select ${b.title}`}
            />
          ),
        }}
        renderRowCard={(b) => (
          <RowCard
            onOpen={() => router.push(`/admin/books/${b.id}`)}
            leading={
              <SelectCheckbox
                checked={sel.includes(b.id)}
                onChange={() => selection.toggleOne(b.id)}
                label={`Select ${b.title}`}
              />
            }
            action={<RowActionsMenu label={b.title} actions={menuActions(b, true)} />}
          >
            <RowCardBody
              visual={
                <BookCover book={b} size="M" fallback="tiny" showAuthor={false} className="w-[30px] flex-none" />
              }
              title={b.title}
              meta={`${b.author} · ${b.genre}`}
              value={<MoneyCell amount={b.price} />}
              badge={
                (b.status ?? 'Published') !== 'Published'
                  ? bookStatusPill(b.status, true)
                  : <StockLevelPill stock={b.stock} className="px-2 py-0.5 text-[10px]" />
              }
            />
          </RowCard>
        )}
        toolbar={
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by title or author…"
            hasFiltersApplied={urlState.filtersActive}
            filterCount={filterCount}
            onClearAll={clearFilters}
            actions={
              <>
                {sel.length > 0 && (
                  <button
                    type="button"
                    onClick={onBulkDelete}
                    className="btn-outline-rust flex h-11 items-center px-[18px] text-[13px] whitespace-nowrap"
                  >
                    Delete selected ({sel.length})
                  </button>
                )}
                <Link
                  href="/admin/books/new"
                  className="btn-primary flex h-11 items-center px-5 text-[13.5px] whitespace-nowrap no-underline shadow-none hover:no-underline"
                >
                  + Add a book
                </Link>
              </>
            }
            filterFields={
              <>
                <select
                  value={filters.shelf ?? ''}
                  onChange={(e) => setFilters({ shelf: e.target.value || undefined })}
                  className={toolbarSelectCls}
                >
                  <option value="">All shelves</option>
                  {GENRES.filter((g) => g !== 'All').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.stock ?? ''}
                  onChange={(e) => setFilters({ stock: e.target.value || undefined })}
                  className={toolbarSelectCls}
                >
                  <option value="">Any stock level</option>
                  <option value="in">In stock</option>
                  <option value="low">Low stock</option>
                  <option value="out">Out of stock</option>
                </select>
                <select
                  value={filters.status ?? ''}
                  onChange={(e) => setFilters({ status: e.target.value || undefined })}
                  className={toolbarSelectCls}
                >
                  <option value="">Any visibility</option>
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
                <select
                  value={filters.price ?? ''}
                  onChange={(e) => setFilters({ price: e.target.value || undefined })}
                  className={toolbarSelectCls}
                >
                  <option value="">Any price</option>
                  <option value="u100">Under GH₵100</option>
                  <option value="100200">GH₵100-200</option>
                  <option value="o200">Over GH₵200</option>
                </select>
              </>
            }
            chips={
              <ActiveFilterChips
                items={[
                  ...(filters.shelf
                    ? [{ key: 'shelf', label: `Shelf: ${filters.shelf}`, onRemove: () => setFilters({ shelf: undefined }) }]
                    : []),
                  ...(filters.stock
                    ? [{ key: 'stock', label: STOCK_LABELS[filters.stock] ?? filters.stock, onRemove: () => setFilters({ stock: undefined }) }]
                    : []),
                  ...(filters.price
                    ? [{ key: 'price', label: PRICE_LABELS[filters.price] ?? filters.price, onRemove: () => setFilters({ price: undefined }) }]
                    : []),
                  ...(filters.status
                    ? [{ key: 'status', label: filters.status, onRemove: () => setFilters({ status: undefined }) }]
                    : []),
                ]}
              />
            }
          />
        }
        pagination={
          <TablePagination
            table={table}
            pageSize={urlState.pageSize}
            onPageChange={urlState.setPage}
            onPageSizeChange={urlState.setPageSize}
            entityLabel="titles"
          />
        }
        emptyState={
          <EmptyState
            title="The shelf is empty."
            description="Add your first book and it will appear here and on the storefront."
            action={{ label: '+ Add a book', href: '/admin/books/new' }}
          />
        }
        entityLabel="books"
        onClearFilters={clearFilters}
      />
      {dialog}
    </ListPageFrame>
  );
}
