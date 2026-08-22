// src/components/store/book-detail-client.tsx
'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { fmtCedis, yearLabel } from '@/lib/format';
import { useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { BookCover } from '@/components/ui/BookCover';
import { StarRating } from '@/components/ui/StarRating';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import { useShopActions } from './use-shop-actions';

export function BookDetailClient({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const books = useAppSelector((s) => s.catalog.books);
  const { addBook, toggleWishlist, wishlist } = useShopActions();

  const book = books.find((b) => b.slug === slug);

  if (!book) {
    return (
      <section className="animate-fade-up mx-auto max-w-[640px] pt-16 pb-16">
        <EmptyState
          eyebrow="Out of print"
          title="This title has left the shelf."
          description="It may have been retired or renamed. The rest of the shop is still very much here."
          action={{ label: 'Back to the shop', href: '/shop', variant: 'dark' }}
        />
      </section>
    );
  }

  const wished = hydrated && wishlist.includes(book.id);
  const soldOut = book.stock === 0;
  const related = books.filter((b) => b.genre === book.genre && b.id !== book.id).slice(0, 5);

  const stockMsg = soldOut
    ? 'Out of stock'
    : book.stock <= 5
      ? `Only ${book.stock} left`
      : 'In stock - ships today';
  const stockColor = soldOut ? 'text-rust' : book.stock <= 5 ? 'text-gold-deep' : 'text-pine';

  return (
    <section className="animate-fade-up pt-8 pb-16">
      <Link
        href="/shop"
        className="mb-[26px] inline-block text-[13px] font-bold text-sage no-underline hover:text-pine hover:no-underline"
      >
        ← Back to the shop
      </Link>
      <div className="flex flex-wrap gap-11">
        <div className="min-w-[240px] flex-[0_1_300px]">
          <BookCover book={book} fallback="large" className="shadow-[0_20px_44px_rgba(18,30,23,0.25)]" />
        </div>
        <div className="min-w-[280px] flex-[1_1_380px]">
          <div className="mb-2.5 text-[11px] font-bold tracking-[0.24em] text-pine uppercase">
            {book.genre} · {yearLabel(book.year)}
          </div>
          <h1 className="m-0 mb-2 font-serif text-[clamp(30px,4.5vw,44px)] leading-[1.1] font-normal">
            {book.title}
          </h1>
          <Link
            href={`/authors/${encodeURIComponent(book.author)}`}
            className="mb-3.5 inline-block text-base font-medium text-pine no-underline hover:underline"
          >
            by {book.author}
          </Link>
          <div className="mb-[18px] text-[15px] text-gold">
            <StarRating rating={book.rating} size={14} />{' '}
            <span className="text-sage">
              {book.rating} · {book.pages} pages · paperback
            </span>
          </div>
          <div className="mb-1.5 flex items-baseline gap-3.5">
            <div className="text-[30px] font-bold">{fmtCedis(book.price)}</div>
            <div className={cn('text-[13px] font-semibold', stockColor)}>{stockMsg}</div>
          </div>
          <p className="my-3.5 mb-6 max-w-[56ch] text-[15.5px] leading-[1.7] text-moss [text-wrap:pretty]">
            {book.blurb}
          </p>
          <div className="mb-[22px] flex flex-wrap gap-3">
            <button
              type="button"
              disabled={soldOut}
              onClick={() => addBook(book.id)}
              className="btn-primary px-[30px] py-[15px] text-[15px]"
            >
              {soldOut ? 'Out of stock' : 'Add to basket'}
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(book.id)}
              className="btn-outline-ink px-[22px] py-[15px] text-sm"
            >
              <Heart
                className="mr-1.5 inline h-4 w-4 align-[-3px]"
                fill={wished ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              {wished ? 'Saved' : 'Save for later'}
            </button>
          </div>
          <div className="glass max-w-[52ch] px-[18px] py-3.5 text-[13.5px] leading-[1.6] text-moss">
            Orders placed before 2pm ship the same day from Tamale. Delivery in Tamale 1-2 days,
            nationwide 2-4 days. Free in Tamale over GH₵250.
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="m-0 mb-[18px] font-serif text-[26px] font-normal">From the same shelf</h2>
          <div className="flex gap-5 overflow-x-auto p-1 pb-4 [scrollbar-width:thin]">
            {related.map((b) => (
              <Link
                key={b.id}
                href={`/books/${b.slug}`}
                className="group flex w-[140px] flex-none cursor-pointer flex-col gap-2 text-ink no-underline hover:no-underline"
              >
                <div className="shadow-[0_8px_20px_rgba(18,30,23,0.15)] transition-transform duration-200 group-hover:-translate-y-1">
                  <BookCover book={b} fallback="tiny" showAuthor={false} />
                </div>
                <div className="font-serif text-sm leading-tight">{b.title}</div>
                <div className="text-[13px] font-bold">{fmtCedis(b.price)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
