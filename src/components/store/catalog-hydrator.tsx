// src/components/store/catalog-hydrator.tsx
'use client';

import { useEffect, useRef } from 'react';
import { setBooks } from '@/redux/catalog-slice';
import { useAppDispatch } from '@/redux/store';
import type { Book } from '@/data/catalog';

interface CatalogHydratorProps {
  books: Book[];
  children: React.ReactNode;
}

/**
 * Seeds the redux catalogue from the server-fetched (cached, tag-revalidated)
 * book list. The first seed happens during render - before any child
 * subscribes - so the initial client render already shows live data instead
 * of flashing the static seed. Later payloads (after a revalidation) are
 * dispatched from an effect, once subscribers exist.
 */
export function CatalogHydrator({ books, children }: CatalogHydratorProps) {
  const dispatch = useAppDispatch();

  const seededRef = useRef<Book[] | null>(null);
  if (seededRef.current == null) {
    seededRef.current = books;
    dispatch(setBooks(books));
  }

  const lastBooksRef = useRef(books);
  useEffect(() => {
    if (lastBooksRef.current !== books) {
      lastBooksRef.current = books;
      dispatch(setBooks(books));
    }
  }, [books, dispatch]);

  return <>{children}</>;
}
