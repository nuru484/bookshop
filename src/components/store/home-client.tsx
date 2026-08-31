// src/components/store/home-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GENRES } from '@/data/catalog';
import { fmtCedis } from '@/lib/format';
import { useAppSelector } from '@/redux/store';
import { BookCover } from '@/components/ui/BookCover';
import { BookCard } from './book-card';
import { useShopActions } from './use-shop-actions';

// Cover widths scale with the viewport so the fan never overflows tiny
// screens (Galaxy Fold, 280px) while keeping the original size from ~sm up.
const HERO_TILT = [
  'w-[clamp(76px,26vw,150px)] rotate-[-7deg] translate-y-2.5 z-[1] shadow-[0_14px_30px_rgba(18,30,23,0.25)]',
  'w-[clamp(96px,32vw,180px)] -translate-y-3.5 z-[2] -mx-[clamp(8px,3vw,18px)] shadow-[0_18px_40px_rgba(18,30,23,0.3)]',
  'w-[clamp(76px,26vw,150px)] rotate-[7deg] translate-y-2.5 z-[1] shadow-[0_14px_30px_rgba(18,30,23,0.25)]',
];

export function HomeClient() {
  const router = useRouter();
  const books = useAppSelector((s) => s.catalog.books);
  const { addBook } = useShopActions();

  const arrivals = books.filter((b) => b.isNew);
  const picks = books.filter((b) => b.staffPick);
  const heroes = arrivals.slice(0, 3);
  const shelves = GENRES.filter((g) => g !== 'All').map((g) => ({
    name: g,
    count: books.filter((b) => b.genre === g).length,
  }));

  return (
    <div className="animate-fade-up">
      {/* Hero */}
      <section className="flex flex-wrap items-center gap-10 overflow-hidden pt-[54px] pb-11">
        <div className="min-w-0 flex-[1_1_340px]">
          <div className="mb-3.5 text-[11px] font-bold tracking-[0.26em] text-pine uppercase">
            Est. 2019 · Tamale, Northern Region
          </div>
          <h1 className="m-0 mb-[18px] font-serif text-[clamp(40px,6vw,64px)] leading-[1.05] font-normal tracking-[-0.015em]">
            Read the season <em className="text-pine">slowly</em>.
          </h1>
          <p className="m-0 mb-[26px] max-w-[46ch] text-[16.5px] leading-[1.65] text-moss [text-wrap:pretty]">
            A small shop with strong opinions. We keep the classics in print, in stock, and in
            your hands - hand-picked editions, delivered anywhere in Ghana.
          </p>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
            <Link
              href="/shop"
              className="btn-primary inline-block w-full px-[26px] py-3.5 text-center text-[15px] no-underline hover:no-underline sm:w-auto"
            >
              Browse the shop
            </Link>
            <Link
              href="/shop"
              className="btn-outline-ink inline-block w-full px-[26px] py-3.5 text-center text-[15px] whitespace-nowrap no-underline hover:no-underline sm:w-auto"
            >
              New arrivals
            </Link>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] items-center justify-center py-5">
          <div className="flex items-center">
            {heroes.map((book, i) => (
              <button
                key={book.id}
                type="button"
                onClick={() => router.push(`/books/${book.slug}`)}
                aria-label={book.title}
                className={`relative cursor-pointer border-none bg-transparent p-0 ${HERO_TILT[i] ?? ''}`}
              >
                <BookCover book={book} fallback="card" className="w-full" />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Promo banner */}
      <section className="mb-14 flex flex-wrap items-center gap-[18px] bg-pine px-[26px] py-[22px] text-cream-bright">
        <div className="flex-[1_1_300px]">
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.22em] uppercase opacity-85">
            Limited shelf life
          </div>
          <div className="font-serif text-2xl">
            15% off the Gothic shelf with code{' '}
            <strong className="font-sans text-lg tracking-[0.06em]">SEASON15</strong>
          </div>
        </div>
        <Link
          href="/shop?shelf=Gothic"
          className="inline-block w-full cursor-pointer border-none bg-cream-bright px-[22px] py-3 text-center text-sm font-bold text-pine-deep no-underline transition-colors hover:bg-ink hover:text-cream hover:no-underline sm:w-auto"
        >
          Shop Gothic
        </Link>
      </section>

      {/* New arrivals */}
      <section className="mb-14">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="m-0 font-serif text-[30px] font-normal">New arrivals</h2>
          <Link
            href="/shop"
            className="p-1 text-[13px] font-bold text-pine no-underline hover:no-underline"
          >
            View all →
          </Link>
        </div>
        <div className="flex gap-5 overflow-x-auto p-1 pb-4 [scrollbar-width:thin]">
          {arrivals.map((book) => (
            <BookCard key={book.id} book={book} rail />
          ))}
        </div>
      </section>

      {/* Staff picks */}
      <section className="mb-14">
        <h2 className="m-0 mb-1.5 font-serif text-[30px] font-normal">Staff picks</h2>
        <p className="m-0 mb-[22px] text-[14.5px] text-sage">
          {"What we're pressing into people's hands this month."}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {picks.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.slug}`}
              className="glass flex h-full cursor-pointer gap-3 p-4 text-ink no-underline transition-shadow duration-200 hover:no-underline hover:shadow-[0_10px_24px_rgba(18,30,23,0.12)]"
            >
              <BookCover
                book={book}
                fallback="tiny"
                showAuthor={false}
                className="w-[72px] flex-none self-start"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="line-clamp-2 font-serif text-[17px] leading-tight">{book.title}</div>
                <div className="truncate text-xs font-medium text-sage">
                  {book.author} · {book.genre}
                </div>
                <p className="m-0 line-clamp-2 text-[12.5px] leading-[1.5] text-moss">{book.blurb}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-sm font-bold">{fmtCedis(book.price)}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      addBook(book.id);
                    }}
                    className="btn-outline-pine shrink-0 px-3 py-[5px] text-xs"
                  >
                    Add to basket
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse by shelf */}
      <section className="mb-14">
        <h2 className="m-0 mb-[22px] font-serif text-[30px] font-normal">Browse by shelf</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          {shelves.map((shelf) => (
            <Link
              key={shelf.name}
              href={`/shop?shelf=${shelf.name}`}
              className="glass cursor-pointer px-4 py-[22px] text-left text-ink no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-pine hover:no-underline"
            >
              <div className="mb-1 font-serif text-[21px]">{shelf.name}</div>
              <div className="text-xs font-semibold text-sage">{shelf.count} titles</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="mb-16 border-y border-mist px-5 py-11 text-center">
        <p className="mx-auto mb-2.5 max-w-[34ch] font-serif text-[clamp(20px,3vw,28px)] leading-normal italic text-[#3E3524]">
          {'"A room without books is like a body without a soul."'}
        </p>
        <div className="text-[11px] font-bold tracking-[0.24em] text-sage uppercase">Cicero</div>
      </section>
    </div>
  );
}
