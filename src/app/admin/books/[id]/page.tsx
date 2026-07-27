// src/app/admin/books/[id]/page.tsx
import type { Metadata } from 'next';
import BookDetailClient from '@/components/admin/book-detail-client';

export const metadata: Metadata = { title: 'Book detail' };

export default async function AdminBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookDetailClient bookId={Number(id)} />;
}
