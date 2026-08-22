// src/components/store/book-card.tsx
'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { Book } from '@/data/catalog';
import { fmtCedis } from '@/lib/format';
import { cardBadge } from '@/lib/status-colors';
import { BookCover } from '@/components/ui/BookCover';
import { StarRating } from '@/components/ui/StarRating';
import { useHydrated } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';
import { useShopActions } from './use-shop-actions';

interface BookCardProps {
  book: Book;
  /** Gold star row under the author (shop grid). */
  showRating?: boolean;
  /** Fixed-width rail item instead of a fluid grid cell. */
  rail?: boolean;
  className?: string;
}

/**
 * The storefront's standard book card: cover with wishlist heart + badge,
 * serif title, author, price + Add. The whole card links to the detail page;
 * the action buttons stop the navigation.
 */
export function BookCard({ book, showRating = false, rail = false, className }: BookCardProps) {
  const hydrated = useHydrated();
  const { addBook, toggleWishlist, wishlist } = useShopActions();
  const wished = hydrated && wishlist.includes(book.id);
  const badge = cardBadge(book);

  return (
    <Link
      href={`/books/${book.slug}`}
      className={cn(
        'group flex cursor-pointer flex-col gap-2.5 text-ink no-underline hover:no-underline',
        rail && 'flex-none w-[168px]',
        className,
      )}
    >
      <div className="relative shadow-[0_8px_20px_rgba(18,30,23,0.15)] transition-transform duration-200 group-hover:-translate-y-1">
        <BookCover book={book} />
        <button
          type="button"
          title="Wishlist"
          aria-label={wished ? `Remove ${book.title} from wishlist` : `Save ${book.title} to wishlist`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(book.id);
          }}
          className={cn(
            'absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-cream/92 text-base',
            wished ? 'text-pine' : 'text-ink',
          )}
        >
          <Heart className="h-4 w-4" fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
        {badge && (
          <div className="absolute top-2 left-2 bg-ink px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-cream uppercase">
            {badge}
          </div>
        )}
      </div>
      <div>
        <div className="font-serif text-base leading-tight">{book.title}</div>
        <div className="mt-0.5 text-[12.5px] font-medium text-sage">{book.author}</div>
        {showRating && (
          <div className="mt-0.5 text-xs text-gold">
            <StarRating rating={book.rating} size={12} /> <span className="text-sage">{book.rating}</span>
          </div>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-[14.5px] font-bold">{fmtCedis(book.price)}</div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addBook(book.id);
          }}
          className="btn-outline-pine px-3 py-1.5 text-xs"
        >
          Add
        </button>
      </div>
    </Link>
  );
}
