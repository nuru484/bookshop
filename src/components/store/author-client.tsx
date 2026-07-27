// src/components/store/author-client.tsx
'use client';

import Link from 'next/link';
import { useAppSelector } from '@/redux/store';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookCard } from './book-card';

export function AuthorClient({ name }: { name: string }) {
  const books = useAppSelector((s) => s.catalog.books);
  const authorBooks = books.filter((b) => b.author === name);

  return (
    <section className="animate-fade-up pt-10 pb-16">
      <Link
        href="/shop"
        className="mb-5 inline-block text-[13px] font-bold text-sage no-underline hover:text-pine hover:no-underline"
      >
        ← Back to the shop
      </Link>
      <div className="mb-2 text-[11px] font-bold tracking-[0.24em] text-pine uppercase">
        Author collection
      </div>
      <h1 className="m-0 mb-[26px] font-serif text-[40px] font-normal">{name}</h1>

      {authorBooks.length === 0 ? (
        <EmptyState
          title="No titles by this author right now."
          description="We rotate the shelves often - check back, or browse the rest of the shop."
          action={{ label: 'Browse the shop', href: '/shop', variant: 'dark' }}
          className="my-2"
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(165px,1fr))] gap-[22px]">
          {authorBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </section>
  );
}
