// src/components/store/search-client.tsx
'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { fmtCedis } from '@/lib/format';
import { addRecentSearch, clearRecentSearches, removeRecentSearch } from '@/redux/shop-slice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
  useSearchBooksQuery,
  useLogSearchMutation,
  useGetPopularSearchesQuery,
} from '@/redux/catalog-api';
import { useHydrated } from '@/hooks/use-hydrated';
import { useDebounce } from '@/hooks/use-debounce';
import { BookCover } from '@/components/ui/BookCover';
import { BookGridSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SHOP_PAGE_SIZE, ShowMore } from './show-more';

const MIN_QUERY = 2;

/** Chip strip that scrolls horizontally instead of wrap-stacking on phones. */
function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
      style={{ scrollbarWidth: 'thin' }}
    >
      {children}
    </div>
  );
}

export function SearchClient() {
  const hydrated = useHydrated();
  const dispatch = useAppDispatch();
  const books = useAppSelector((s) => s.catalog.books);
  const recent = useAppSelector((s) => s.shop.recent);

  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(SHOP_PAGE_SIZE);
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  const debouncedQ = useDebounce(trimmed, 300);
  const active = debouncedQ.length >= MIN_QUERY;

  // Live search over the published catalogue, server-side ranked.
  const { data, isFetching, isError, refetch } = useSearchBooksQuery(debouncedQ, {
    skip: !active,
  });
  const results = active && data ? data.data : [];
  const searching = active && isFetching && !data;

  // "Mostly searched by others" comes from the aggregated search log.
  const { data: popularData, isLoading: popularLoading } = useGetPopularSearchesQuery();
  const popular = popularData?.data ?? [];

  const [logSearch] = useLogSearchMutation();

  // Reset pagination whenever the (debounced) query changes.
  const [prevQ, setPrevQ] = useState(debouncedQ);
  if (debouncedQ !== prevQ) {
    setPrevQ(debouncedQ);
    setVisible(SHOP_PAGE_SIZE);
  }

  const pageResults = results.slice(0, visible);

  /**
   * A COMMITTED search (Enter, opening a result, tapping a suggestion) is
   * what gets remembered locally and logged for the popular list - never
   * every keystroke.
   */
  const commitSearch = (term: string) => {
    const t = term.trim();
    if (t.length < MIN_QUERY) return;
    dispatch(addRecentSearch(t));
    logSearch(t)
      .unwrap()
      .catch(() => {});
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const applySuggestion = (term: string) => {
    setQuery(term);
    commitSearch(term);
    inputRef.current?.focus();
  };

  const searchMsg = !active
    ? `Search our whole shelf - ${books.length} titles and counting.`
    : searching
      ? `Searching for "${debouncedQ}"…`
      : isError
        ? ''
        : `${results.length} result${results.length === 1 ? '' : 's'} for "${debouncedQ}"`;

  return (
    <section className="animate-fade-up mx-auto max-w-[820px] pt-10 pb-16">
      <h1 className="m-0 mb-5 font-serif text-[40px] font-normal">Find a book</h1>

      <div className="relative mb-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch(query);
            if (e.key === 'Escape') clearQuery();
          }}
          placeholder={'Title or author - try "Austen" or "whale"…'}
          autoFocus
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search books by title or author"
          className="input-glass w-full box-border py-4 pr-12 pl-5 text-[17px] font-normal [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent text-sage transition-colors hover:text-ink"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <div aria-live="polite" className="mb-6 text-[13px] font-medium text-sage">
        {searchMsg}
      </div>

      {!active && (
        <div className="mb-2.5 flex flex-col gap-6">
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold tracking-[0.22em] text-sage uppercase">
                Recently searched
              </div>
              {hydrated && recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(clearRecentSearches())}
                  className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-[12px] font-semibold text-sage underline hover:text-pine"
                >
                  Clear all
                </button>
              )}
            </div>
            {hydrated && recent.length > 0 ? (
              <ChipRow>
                {recent.map((r) => (
                  <span
                    key={r}
                    className="flex shrink-0 items-center border border-ink/18 bg-white/55 whitespace-nowrap text-ink transition-colors hover:border-pine"
                  >
                    <button
                      type="button"
                      onClick={() => applySuggestion(r)}
                      className="cursor-pointer border-none bg-transparent py-2 pr-1.5 pl-3.5 text-[13px] font-semibold text-inherit hover:text-pine"
                    >
                      ↺ {r}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(removeRecentSearch(r));
                      }}
                      aria-label={`Remove "${r}" from recent searches`}
                      className="flex h-8 cursor-pointer items-center border-none bg-transparent pr-2.5 pl-1 text-sage hover:text-rust"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </ChipRow>
            ) : (
              <span className="text-[13px] text-sage">
                Nothing yet - your searches will appear here.
              </span>
            )}
          </div>

          {(popularLoading || popular.length > 0) && (
            <div>
              <div className="mb-2.5 text-[11px] font-bold tracking-[0.22em] text-sage uppercase">
                Mostly searched by others
              </div>
              {popularLoading ? (
                <div aria-busy="true" className="flex items-center gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 shrink-0" />
                  ))}
                </div>
              ) : (
                <ChipRow>
                  {popular.map((p) => (
                    <button
                      key={p.term}
                      type="button"
                      onClick={() => applySuggestion(p.term)}
                      className="btn-outline-pine shrink-0 px-3.5 py-2 text-[13px] whitespace-nowrap"
                    >
                      {p.term}
                    </button>
                  ))}
                </ChipRow>
              )}
            </div>
          )}
        </div>
      )}

      {active && searching && <BookGridSkeleton count={8} />}

      {active && isError && (
        <ErrorState
          title="Search hit a snag"
          description="Something went wrong on our side. Try again in a moment."
          onRetry={() => void refetch()}
        />
      )}

      {active && !searching && !isError && results.length === 0 && (
        <EmptyState
          title={`Nothing matches "${debouncedQ}"`}
          description="Try a different spelling, or browse the shelves instead."
          action={{ label: 'Clear search', variant: 'dark', onClick: clearQuery }}
          className="my-2"
        />
      )}

      {active && !searching && !isError && results.length > 0 && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-[22px]">
            {pageResults.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.slug}`}
                onClick={() => commitSearch(debouncedQ)}
                className="flex cursor-pointer flex-col gap-2.5 text-ink no-underline hover:no-underline"
              >
                <div className="shadow-[0_8px_20px_rgba(18,30,23,0.15)]">
                  <BookCover book={book} showAuthor={false} />
                </div>
                <div className="font-serif text-base leading-tight">{book.title}</div>
                <div className="text-[12.5px] font-medium text-sage">
                  {book.author} · {fmtCedis(book.price)}
                </div>
              </Link>
            ))}
          </div>
          <ShowMore
            shown={pageResults.length}
            total={results.length}
            onMore={() => setVisible((v) => v + SHOP_PAGE_SIZE)}
            noun="results"
          />
        </>
      )}
    </section>
  );
}
