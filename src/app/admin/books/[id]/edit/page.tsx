// src/app/admin/books/[id]/edit/page.tsx
import type { Metadata } from 'next';
import BookForm from '@/components/admin/book-form';

export const metadata: Metadata = { title: 'Edit book' };

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookForm bookId={Number(id)} />;
}
