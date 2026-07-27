// src/app/admin/books/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import BooksClient from '@/components/admin/books-client';

export const metadata: Metadata = { title: 'Books' };

export default function AdminBooksPage() {
  return (
    <Suspense>
      <BooksClient />
    </Suspense>
  );
}
