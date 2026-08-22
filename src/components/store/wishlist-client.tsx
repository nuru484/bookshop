// src/components/store/wishlist-client.tsx
'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { fmtCedis } from '@/lib/format';
import { useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { BookCover } from '@/components/ui/BookCover';
import { BookGridSkeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useShopActions } from './use-shop-actions';
import { useWishlist } from './use-wishlist';

export function WishlistClient() {
  const hydrated = useHydrated();
  const books = useAppSelector((s) => s.catalog.books);
  const { wishlist, loading, error, refetch } = useWishlist();
  const { addBook, toggleWishlist } = useShopActions();

  const wishBooks = books.filter((b) => wishlist.includes(b.id));
  const wishMsg =
    wishBooks.length > 0
      ? `${wishBooks.length} book${wishBooks.length === 1 ? '' : 's'} saved for later.`
      : "Books you're circling but haven't committed to.";

  if (hydrated && error) {
    return (
      <section className="animate-fade-up pt-10 pb-16">
        <h1 className="m-0 mb-[26px] font-serif text-[40px] font-normal">Wishlist</h1>
        <ErrorState title="Couldn't load your wishlist" onRetry={() => void refetch()} />
      </section>
    );
  }

  return (
    <section className="animate-fade-up pt-10 pb-16">
      <h1 className="m-0 mb-1.5 font-serif text-[40px] font-normal">Wishlist</h1>
      <p className="m-0 mb-[26px] text-[14.5px] text-sage">
        {hydrated && !loading ? wishMsg : '…'}
      </p>

      {!hydrated || loading ? (
        <BookGridSkeleton count={4} />
      ) : wishBooks.length === 0 ? (
        <div className="glass-dashed px-5 py-[50px] text-center">
          <div className="mb-2 font-serif text-2xl text-ink">Nothing dog-eared yet</div>
          <p className="m-0 mb-[18px] text-sm text-sage">
            Tap the <Heart className="inline h-3.5 w-3.5 align-[-2px]" role="img" aria-label="heart" />{' '}
            on any book to keep it here for later.
          </p>
          <Link
            href="/shop"
            className="btn-primary inline-block px-6 py-3 text-sm no-underline hover:no-underline"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-[22px]">
          {wishBooks.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.slug}`}
              className="flex cursor-pointer flex-col gap-2.5 text-ink no-underline hover:no-underline"
            >
              <div className="relative shadow-[0_8px_20px_rgba(18,30,23,0.15)]">
                <BookCover book={book} />
                <button
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${book.title} from wishlist`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(book.id);
                  }}
                  className="absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-cream/92 text-base text-pine"
                >
                  <Heart className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                </button>
              </div>
              <div className="font-serif text-base leading-tight">{book.title}</div>
              <div className="flex items-center justify-between gap-2">
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
          ))}
        </div>
      )}
    </section>
  );
}
