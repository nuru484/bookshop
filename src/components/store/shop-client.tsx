// src/components/store/shop-client.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { GENRES, type Book } from '@/data/catalog';
import { addRecentSearch } from '@/redux/shop-slice';
import { useLogSearchMutation } from '@/redux/catalog-api';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useDebounce } from '@/hooks/use-debounce';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { BookCard } from './book-card';
import { SHOP_PAGE_SIZE, ShowMore } from './show-more';

type SortKey = 'featured' | 'priceAsc' | 'priceDesc' | 'title' | 'rating';

const SORTS: Record<SortKey, (a: Book, b: Book) => number> = {
  featured: (a, b) => (b.sold || 0) - (a.sold || 0),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  title: (a, b) => a.title.localeCompare(b.title),
  rating: (a, b) => b.rating - a.rating,
};

export function ShopClient() {
  const searchParams = useSearchParams();
  const shelfParam = searchParams.get('shelf');
  const dispatch = useAppDispatch();
  const books = useAppSelector((s) => s.catalog.books);
  const [logSearch] = useLogSearchMutation();

  /** Committed searches (Enter) feed the recent + popular lists. */
  const commitSearch = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    dispatch(addRecentSearch(t));
    logSearch(t)
      .unwrap()
      .catch(() => {});
  };

  const [genre, setGenre] = useState<string>(
    shelfParam && GENRES.includes(shelfParam as (typeof GENRES)[number]) ? shelfParam : 'All',
  );
  const [sort, setSort] = useState<SortKey>('featured');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(SHOP_PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const q = debouncedQuery.trim().toLowerCase();

  // Reset pagination whenever shelf, sort or search changes (adjust-during-render).
  const viewKey = `${genre}:${sort}:${q}`;
  const [prevViewKey, setPrevViewKey] = useState(viewKey);
  if (viewKey !== prevViewKey) {
    setPrevViewKey(viewKey);
    setVisible(SHOP_PAGE_SIZE);
  }

  const clearSearch = () => {
    setQuery('');
    searchRef.current?.focus();
  };

  const shopBooks = books
    .filter((b) => genre === 'All' || b.genre === genre)
    .filter((b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
    .slice()
    .sort(SORTS[sort]);

  const pageBooks = shopBooks.slice(0, visible);

  const countLine = q
    ? `${shopBooks.length} result${shopBooks.length === 1 ? '' : 's'} for "${debouncedQuery.trim()}"${genre !== 'All' ? ` on the ${genre} shelf` : ''}`
    : `${shopBooks.length} titles`;

  return (
    <section className="animate-fade-up pt-10 pb-16">
      <div className="mb-5 flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 font-serif text-[40px] font-normal">The Shop</h1>
        <span className="text-sm font-medium text-sage">{countLine}</span>
      </div>

      {/* Search box */}
      <div className="relative mb-3.5">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-sage"
        />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitSearch(query);
            if (e.key === 'Escape') clearSearch();
          }}
          type="search"
          enterKeyHint="search"
          placeholder="Search the shelf by title or author…"
          aria-label="Search books"
          className="input-glass box-border w-full py-[13px] pr-11 pl-11 text-[15px] font-normal [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent text-sage hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Shelf chips: horizontally scrollable strip, sort beside on lg */}
      <div className="mb-[26px] flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div
          className="-mx-1 flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto px-1 pb-1 lg:pb-0"
          style={{ scrollbarWidth: 'thin' }}
        >
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenre(g)}
              className={cn(
                'shrink-0 cursor-pointer border-[1.5px] border-pine px-4 py-2 text-[13px] font-bold whitespace-nowrap transition-colors',
                genre === g ? 'bg-pine text-cream-bright' : 'bg-transparent text-pine hover:bg-pine/10',
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort books"
          className="input-glass shrink-0 cursor-pointer self-end px-3 py-[9px] text-[13px] font-semibold lg:ml-auto lg:self-auto"
        >
          <option value="featured">Sort: Featured</option>
          <option value="priceAsc">Price: low to high</option>
          <option value="priceDesc">Price: high to low</option>
          <option value="title">Title A-Z</option>
          <option value="rating">Highest rated</option>
        </select>
      </div>

      {shopBooks.length === 0 ? (
        q ? (
          <EmptyState
            title={`Nothing matches "${debouncedQuery.trim()}".`}
            description="Check the spelling, or try a different title or author."
            action={{ label: 'Clear search', variant: 'dark', onClick: clearSearch }}
            className="my-2"
          />
        ) : (
          <EmptyState
            title="Nothing on this shelf right now."
            description="Try another shelf, or browse everything we have in stock."
            action={{ label: 'Show all books', variant: 'dark', onClick: () => setGenre('All') }}
            className="my-2"
          />
        )
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-[22px]">
            {pageBooks.map((book) => (
              <BookCard key={book.id} book={book} showRating />
            ))}
          </div>
          <ShowMore
            shown={pageBooks.length}
            total={shopBooks.length}
            onMore={() => setVisible((v) => v + SHOP_PAGE_SIZE)}
          />
        </>
      )}
    </section>
  );
}
