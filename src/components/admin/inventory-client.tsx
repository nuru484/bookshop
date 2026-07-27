// src/components/admin/inventory-client.tsx
'use client';

import { useId, useMemo, useState } from 'react';
import {
  useGetBooksQuery,
  useRestockBookMutation,
  useCreateBookMutation,
} from '@/redux/catalog-api';
import { useConfirm } from '@/hooks/use-confirm';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { notify } from '@/lib/notify';
import { extractApiError } from '@/utils/extract-api-error';
import { cn } from '@/lib/utils';
import { StockLevelPill } from '@/components/ui/StatusPill';
import { BookCover } from '@/components/ui/BookCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { GENRES, LOW_STOCK_THRESHOLD, type Book, type Genre } from '@/data/catalog';
import { PageHeader } from './page-header';
import { FormError, FormField, useFieldErrors } from './form-field';
import { useServerTable, type SortState } from './table/data-table';
import { TableToolbar, toolbarSelectCls } from './table/table-toolbar';
import { ActiveFilterChips } from './table/active-filters';
import { TablePagination } from './table/table-pagination';
import { refetchDim } from './api-helpers';

const fieldCls = 'input-glass box-border h-11 w-full px-3.5 text-[14.5px]';

/**
 * Restock modal: search the catalogue, pick a title, choose a quantity.
 * When nothing matches, the query can be turned into a brand-new title on
 * the spot (created Published with its initial stock).
 */
function RestockModal({
  open,
  onClose,
  books,
  preselected,
  onConfirmRestock,
}: {
  open: boolean;
  onClose: () => void;
  books: Book[];
  preselected: Book | null;
  onConfirmRestock: (book: Book, qty: number) => void;
}) {
  const titleId = useId();
  const [createBook, { isLoading: creating }] = useCreateBookMutation();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Book | null>(null);
  const [qty, setQty] = useState('20');
  const [creatingNew, setCreatingNew] = useState(false);
  const [author, setAuthor] = useState('');
  const [price, setPrice] = useState('');
  const [genre, setGenre] = useState<Genre>('Literary');
  const { errors, setErrors, formError, setFormError, clearField, reset, applyServerError } =
    useFieldErrors<'query' | 'author' | 'price' | 'qty'>();

  // Reset each open; honour a preselected book from a card's Restock button.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery('');
      setSelected(preselected);
      setQty('20');
      setCreatingNew(false);
      setAuthor('');
      setPrice('');
      setGenre('Literary');
      reset();
    }
  }

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? books
            .filter(
              (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
            )
            .slice(0, 8)
        : [],
    [books, q],
  );

  const parsedQty = parseInt(qty, 10);
  const qtyValid = Number.isInteger(parsedQty) && parsedQty >= 1 && parsedQty <= 500;

  const submitRestock = () => {
    if (!selected) return;
    if (!qtyValid) {
      setErrors({ qty: 'Between 1 and 500.' });
      return;
    }
    onConfirmRestock(selected, parsedQty);
  };

  const submitCreate = async () => {
    const title = query.trim();
    const next: Partial<Record<'query' | 'author' | 'price' | 'qty', string>> = {};
    if (title.length < 2) next.query = 'Every book needs a title.';
    if (author.trim().length < 2) next.author = 'And an author.';
    if (!(parseFloat(price) > 0)) next.price = 'Price must be above zero.';
    if (!qtyValid) next.qty = 'Between 1 and 500.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }
    try {
      const res = await createBook({
        title,
        author: author.trim(),
        price: parseFloat(price),
        stock: parsedQty,
        genre,
        status: 'Published',
      }).unwrap();
      notify(res.message);
      onClose();
    } catch (e) {
      const message = applyServerError(e);
      if (/title/i.test(message)) {
        setErrors({ query: message });
        setFormError('');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="m-0 mb-1 font-serif text-2xl font-normal text-ink">
        Restock a title
      </h2>
      <p className="m-0 mb-4 text-[13px] text-sage">
        Search the shelf, or create the title if it isn&apos;t stocked yet.
      </p>

      {!selected && !creatingNew && (
        <div className="flex flex-col gap-2.5">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              clearField('query');
            }}
            placeholder="Search by title or author…"
            autoFocus
            aria-invalid={Boolean(errors.query)}
            className={cn(fieldCls, errors.query && 'border-rust')}
          />
          {errors.query && <p className="text-[12.5px] font-medium text-rust">{errors.query}</p>}
          {matches.length > 0 && (
            <ul className="m-0 max-h-[260px] list-none overflow-y-auto border border-mist p-0">
              {matches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(b);
                      reset();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 border-none border-b border-pale bg-transparent px-3 py-2.5 text-left hover:bg-pale"
                  >
                    <BookCover book={b} size="M" fallback="tiny" showAuthor={false} className="w-7 flex-none" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-ink">{b.title}</span>
                      <span className="block truncate text-xs text-sage">{b.author}</span>
                    </span>
                    <StockLevelPill stock={b.stock} className="px-2 py-0.5 text-[10px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && matches.length === 0 && (
            <button
              type="button"
              onClick={() => {
                setCreatingNew(true);
                reset();
              }}
              className="cursor-pointer border border-dashed border-pine bg-transparent px-3.5 py-3 text-left text-[13.5px] font-semibold text-pine hover:bg-fern-pale"
            >
              + Create &quot;{query.trim()}&quot; as a new title
            </button>
          )}
          {!q && (
            <div className="text-[12.5px] text-sage">
              Start typing to find a title on the shelf.
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center gap-3 border border-mist bg-white/35 px-3 py-2.5">
            <BookCover
              book={selected}
              size="M"
              fallback="tiny"
              showAuthor={false}
              className="w-8 flex-none"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold text-ink">{selected.title}</span>
              <span className="block truncate text-xs text-sage">{selected.author}</span>
            </span>
            <StockLevelPill stock={selected.stock} className="px-2 py-0.5 text-[10px]" />
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Choose another title"
              className="cursor-pointer border-none bg-transparent p-1 text-[13px] font-bold text-sage hover:text-ink"
            >
              ✕
            </button>
          </div>
          <FormField
            label="Copies to add"
            error={errors.qty}
            hint={
              qtyValid
                ? `Stock goes from ${selected.stock} to ${selected.stock + parsedQty} copies.`
                : undefined
            }
            className="max-w-[220px]"
          >
            {(props) => (
              <input
                {...props}
                value={qty}
                onChange={(e) => {
                  setQty(e.target.value.replace(/\D/g, ''));
                  clearField('qty');
                }}
                inputMode="numeric"
              />
            )}
          </FormField>
          <FormError message={formError} />
          <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-quiet px-5 py-2.5 text-[13px]">
              Cancel
            </button>
            <button
              type="button"
              onClick={submitRestock}
              className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
            >
              Restock
            </button>
          </div>
        </div>
      )}

      {creatingNew && (
        <div className="flex flex-col gap-3.5">
          <div className="text-[13px] text-moss">
            Creating <span className="font-bold">&quot;{query.trim()}&quot;</span> - it will be
            published on the storefront with its opening stock.
          </div>
          <FormField label="Author" error={errors.author}>
            {(props) => (
              <input
                {...props}
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  clearField('author');
                }}
                placeholder="Charles Dickens"
              />
            )}
          </FormField>
          <div className="flex gap-3.5">
            <FormField label="Price (GH₵)" error={errors.price} className="min-w-0 flex-1">
              {(props) => (
                <input
                  {...props}
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    clearField('price');
                  }}
                  placeholder="120"
                  inputMode="decimal"
                />
              )}
            </FormField>
            <FormField label="Opening stock" error={errors.qty} className="min-w-0 flex-1">
              {(props) => (
                <input
                  {...props}
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value.replace(/\D/g, ''));
                    clearField('qty');
                  }}
                  inputMode="numeric"
                />
              )}
            </FormField>
          </div>
          <FormField label="Shelf">
            {(props) => (
              <select
                {...props}
                value={genre}
                onChange={(e) => setGenre(e.target.value as Genre)}
                className={cn(props.className, 'cursor-pointer font-semibold')}
              >
                {GENRES.filter((g) => g !== 'All').map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </FormField>
          <FormError message={formError} />
          <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCreatingNew(false)}
              className="btn-quiet px-5 py-2.5 text-[13px]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void submitCreate()}
              disabled={creating}
              className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
            >
              {creating ? 'Creating…' : 'Create and stock'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InventorySkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass flex items-center gap-4 px-[18px] py-3.5">
          <Skeleton className="h-[54px] w-9" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

function StockCard({
  book,
  onRestock,
  urgent,
}: {
  book: Book;
  onRestock: (book: Book) => void;
  urgent?: boolean;
}) {
  return (
    <div className="glass flex flex-wrap items-center gap-4 px-[18px] py-3.5">
      <BookCover book={book} size="M" fallback="tiny" showAuthor={false} className="w-9 flex-none" />
      <div className="min-w-0 flex-[1_1_180px]">
        <div className="truncate text-[14.5px] font-bold">{book.title}</div>
        <div className="truncate text-[12.5px] text-sage">
          {book.author} · sells ~{Math.max(Math.round((book.sold || 0) / 30), 1)} copies a week
        </div>
      </div>
      <StockLevelPill stock={book.stock} className="px-3 py-[5px] text-[11.5px]" />
      <button
        type="button"
        onClick={() => onRestock(book)}
        className={cn(urgent ? 'btn-primary shadow-none' : 'btn-dark', 'px-[18px] py-2.5 text-[13px]')}
      >
        Restock
      </button>
    </div>
  );
}

export default function InventoryClient() {
  const { confirm, dialog } = useConfirm();

  const urlState = useTableUrlState({ filterKeys: ['stock'] });
  const { filters, setFilters, clearFilters, search, setSearch } = urlState;

  // The paginated, filterable list - lowest stock first so trouble surfaces
  // on page 1.
  const { data, isLoading, isFetching, isError, refetch } = useGetBooksQuery({
    page: urlState.page,
    limit: urlState.pageSize,
    search: search || undefined,
    stock: filters.stock,
    sort: 'stock',
    dir: 'asc',
  });

  // The restock modal searches the whole catalogue, not just this page.
  const { data: allData } = useGetBooksQuery({ limit: 100 });
  const allBooks = useMemo(() => allData?.data ?? [], [allData]);

  const [restockBook] = useRestockBookMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [preselected, setPreselected] = useState<Book | null>(null);

  const books = data?.data ?? [];
  const outOfStock = books.filter((b) => b.stock === 0);
  const runningLow = books.filter((b) => b.stock > 0 && b.stock <= LOW_STOCK_THRESHOLD);
  const healthy = books.filter((b) => b.stock > LOW_STOCK_THRESHOLD);

  const DUMMY_SORT: SortState = { key: 'stock', dir: 1 };
  const [sort, setSort] = useState<SortState>(DUMMY_SORT);
  const table = useServerTable<Book>({
    rows: books,
    meta: data?.meta,
    urlState,
    defaultSort: DUMMY_SORT,
    sortState: sort,
    onSortChange: setSort,
  });

  const filterCount = filters.stock ? 1 : 0;
  const STOCK_LABELS: Record<string, string> = {
    out: 'Out of stock',
    low: 'Running low',
    in: 'In stock',
  };

  const openModal = (book: Book | null) => {
    setPreselected(book);
    setModalOpen(true);
  };

  const onConfirmRestock = (book: Book, qty: number) => {
    setModalOpen(false);
    confirm({
      title: `Order ${qty} more cop${qty === 1 ? 'y' : 'ies'} of "${book.title}"?`,
      description: `Stock will go from ${book.stock} to ${book.stock + qty} copies.`,
      confirmText: `Restock +${qty}`,
      onConfirm: async () => {
        try {
          const res = await restockBook({ id: book.id, qty }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });
  };

  const sectionTitle = (text: string, count: number) => (
    <div className="mt-6 mb-2.5 flex items-baseline gap-2 first:mt-0">
      <div className="eyebrow text-[11px]">{text}</div>
      <div className="text-[12px] font-bold text-sage">{count}</div>
    </div>
  );

  const allHealthyHere =
    urlState.page === 1 && !filters.stock && !search && outOfStock.length === 0 && runningLow.length === 0;

  return (
    <div className="max-w-[860px] animate-fade-up">
      <PageHeader
        title="Inventory"
        subtitle="Live stock from the shelf - restock before it goes quiet."
      />

      <TableToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title or author…"
        hasFiltersApplied={urlState.filtersActive}
        filterCount={filterCount}
        onClearAll={clearFilters}
        actions={
          <button
            type="button"
            onClick={() => openModal(null)}
            className="btn-primary flex h-11 items-center px-5 text-[13.5px] whitespace-nowrap shadow-none"
          >
            Restock
          </button>
        }
        filterFields={
          <select
            value={filters.stock ?? ''}
            onChange={(e) => setFilters({ stock: e.target.value || undefined })}
            className={toolbarSelectCls}
          >
            <option value="">Any stock level</option>
            <option value="out">Out of stock</option>
            <option value="low">Running low</option>
            <option value="in">In stock</option>
          </select>
        }
        chips={
          <ActiveFilterChips
            items={
              filters.stock
                ? [{
                    key: 'stock',
                    label: STOCK_LABELS[filters.stock] ?? filters.stock,
                    onRemove: () => setFilters({ stock: undefined }),
                  }]
                : []
            }
          />
        }
      />

      {isLoading ? (
        <InventorySkeleton />
      ) : isError ? (
        <ErrorState title="Couldn't load the inventory" onRetry={() => void refetch()} />
      ) : books.length === 0 ? (
        <EmptyState
          title={urlState.filtersActive ? 'Nothing matches.' : 'The shelf is empty.'}
          description={
            urlState.filtersActive
              ? 'No titles fit the current search and filters.'
              : 'Add books to the catalogue and their stock will be tracked here.'
          }
          action={
            urlState.filtersActive
              ? { label: 'Clear filters', onClick: clearFilters, variant: 'dark' }
              : { label: 'Restock', onClick: () => openModal(null) }
          }
        />
      ) : (
        <div className={refetchDim(isFetching, isLoading)}>
          {allHealthyHere && (
            <EmptyState
              title="Every shelf is healthy"
              description={`Nothing at or below ${LOW_STOCK_THRESHOLD} copies. Well stocked, well read.`}
              className="mb-2"
            />
          )}

          {outOfStock.length > 0 && (
            <>
              {sectionTitle('Out of stock', outOfStock.length)}
              <div className="flex flex-col gap-2.5">
                {outOfStock.map((b) => (
                  <StockCard key={b.id} book={b} onRestock={openModal} urgent />
                ))}
              </div>
            </>
          )}
          {runningLow.length > 0 && (
            <>
              {sectionTitle('Running low', runningLow.length)}
              <div className="flex flex-col gap-2.5">
                {runningLow.map((b) => (
                  <StockCard key={b.id} book={b} onRestock={openModal} />
                ))}
              </div>
            </>
          )}

          {healthy.length > 0 && (
            <>
              {sectionTitle('On the shelf', healthy.length)}
              <div className="glass">
                {healthy.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 border-b border-pale px-4 py-2.5 last:border-0"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">
                        {b.title}
                      </span>
                      <span className="block truncate text-xs text-sage">{b.author}</span>
                    </span>
                    <span className="text-[13px] font-bold whitespace-nowrap text-moss">
                      {b.stock} in stock
                    </span>
                    <button
                      type="button"
                      onClick={() => openModal(b)}
                      className="cursor-pointer border border-mist bg-transparent px-3 py-1.5 text-xs font-bold text-ink hover:border-pine hover:text-pine"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <TablePagination
            table={table}
            pageSize={urlState.pageSize}
            onPageChange={urlState.setPage}
            onPageSizeChange={urlState.setPageSize}
            entityLabel="titles"
          />
        </div>
      )}

      <RestockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        books={allBooks}
        preselected={preselected}
        onConfirmRestock={onConfirmRestock}
      />
      {dialog}
    </div>
  );
}
