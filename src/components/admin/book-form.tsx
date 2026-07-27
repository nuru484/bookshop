// src/components/admin/book-form.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useCreateBookMutation, useGetBookQuery, useUpdateBookMutation } from '@/redux/catalog-api';
import { notify } from '@/lib/notify';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { GENRES, type BookStatus, type Genre } from '@/data/catalog';
import { BOOK_STATUSES } from './book-status';
import { FormError, FormField, useFieldErrors } from './form-field';
import { isNotFound } from './api-helpers';

interface FormState {
  title: string;
  author: string;
  price: string;
  stock: string;
  genre: Genre;
  status: BookStatus;
  year: string;
  isbn: string;
  blurb: string;
}

type FieldKey = keyof FormState;

const BLANK: FormState = {
  title: '',
  author: '',
  price: '',
  stock: '',
  genre: 'Literary',
  status: 'Published',
  year: '',
  isbn: '',
  blurb: '',
};

/** One titled block of related fields, so the form reads in sections. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-mist pb-6 last:border-0 last:pb-0">
      <h2 className="text-xs font-bold tracking-[0.16em] text-sage uppercase">{title}</h2>
      {children}
    </section>
  );
}

function FormSkeleton() {
  return (
    <div aria-busy="true" className="glass-from-sm flex flex-col gap-6 px-1 py-5 sm:px-7 sm:py-6">
      {[0, 1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-4">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BookForm({ bookId }: { bookId?: number }) {
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useGetBookQuery(bookId ?? 0, {
    skip: !bookId,
  });
  const editing = bookId ? data?.data : undefined;

  const [createBook, { isLoading: creating }] = useCreateBookMutation();
  const [updateBook, { isLoading: updating }] = useUpdateBookMutation();
  const saving = creating || updating;

  const [f, setF] = useState<FormState>(BLANK);
  const { errors, setErrors, formError, setFormError, clearField, applyServerError } =
    useFieldErrors<FieldKey>();

  // Seed the form when the edited book arrives (adjust-during-render).
  const [seededFor, setSeededFor] = useState<number | null>(null);
  if (editing && seededFor !== editing.id) {
    setSeededFor(editing.id);
    setF({
      title: editing.title,
      author: editing.author,
      price: String(editing.price),
      stock: String(editing.stock),
      genre: editing.genre,
      status: editing.status ?? 'Published',
      year: String(editing.year),
      isbn: editing.isbn ?? '',
      blurb: editing.blurb ?? '',
    });
  }

  if (bookId && isLoading) {
    return (
      <div className="max-w-[760px] animate-fade-up">
        <Skeleton className="mb-4 h-4 w-28" />
        <Skeleton className="mb-[22px] h-9 w-48" />
        <FormSkeleton />
      </div>
    );
  }

  if (bookId && isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          title="This title isn't on the shelf."
          description="It may have been removed. Head back to the books list."
          action={{ label: '← Back to books', href: '/admin/books', variant: 'dark' }}
          className="mx-auto mt-10 max-w-[560px]"
        />
      );
    }
    return (
      <div className="mx-auto mt-10 max-w-[560px]">
        <ErrorState title="Couldn't load this book" onRetry={() => void refetch()} />
      </div>
    );
  }

  const set =
    (key: FieldKey) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setF((cur) => ({ ...cur, [key]: e.target.value }));
      clearField(key);
    };

  const save = async () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (f.title.trim().length < 2) next.title = 'Every book needs a title.';
    if (f.author.trim().length < 2) next.author = 'And an author.';
    if (!(parseFloat(f.price) > 0)) next.price = 'Price must be above zero.';
    if (!(parseInt(f.stock) >= 0)) next.stock = 'Stock must be 0 or more.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }

    const body = {
      title: f.title.trim(),
      author: f.author.trim(),
      price: parseFloat(f.price),
      stock: parseInt(f.stock),
      genre: f.genre,
      status: f.status,
      year: parseInt(f.year) || undefined,
      isbn: f.isbn.trim(),
      blurb: f.blurb.trim(),
    };

    try {
      const res = editing
        ? await updateBook({ id: editing.id, body }).unwrap()
        : await createBook(body).unwrap();
      notify(res.message);
      router.push('/admin/books');
    } catch (err) {
      // A duplicate title comes back as a 409 about the title field.
      const message = applyServerError(err);
      if (/title/i.test(message)) {
        setErrors({ title: message });
        setFormError('');
      }
    }
  };

  return (
    <div className="max-w-[760px] animate-fade-up">
      <Link
        href="/admin/books"
        className="mb-4 inline-block text-[13px] font-bold text-sage hover:text-pine hover:no-underline"
      >
        ← Back to books
      </Link>
      <h1 className="m-0 mb-[22px] font-serif text-[32px] font-normal">
        {editing ? 'Edit book' : 'Add a book'}
      </h1>

      <div className="glass-from-sm flex flex-col gap-6 px-1 py-5 sm:px-7 sm:py-6">
        <Section title="Book details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Title" error={errors.title} className="md:col-span-2">
              {(props) => (
                <input {...props} value={f.title} onChange={set('title')} placeholder="e.g. Bleak House" />
              )}
            </FormField>
            <FormField label="Author" error={errors.author} className="md:col-span-2">
              {(props) => (
                <input {...props} value={f.author} onChange={set('author')} placeholder="Charles Dickens" />
              )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="Shelf" error={errors.genre}>
              {(props) => (
                <select
                  {...props}
                  value={f.genre}
                  onChange={set('genre')}
                  className={cn(props.className, 'cursor-pointer font-semibold')}
                >
                  {GENRES.filter((g) => g !== 'All').map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField label="Year" error={errors.year}>
              {(props) => <input {...props} value={f.year} onChange={set('year')} placeholder="1853" />}
            </FormField>
            <FormField
              label="ISBN"
              error={errors.isbn}
              hint="Fetches the cover automatically"
            >
              {(props) => (
                <input {...props} value={f.isbn} onChange={set('isbn')} placeholder="9780141439723" />
              )}
            </FormField>
          </div>
        </Section>

        <Section title="Pricing and stock">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField label="Price (GH₵)" error={errors.price}>
              {(props) => <input {...props} value={f.price} onChange={set('price')} placeholder="120" />}
            </FormField>
            <FormField label="Stock" error={errors.stock}>
              {(props) => <input {...props} value={f.stock} onChange={set('stock')} placeholder="20" />}
            </FormField>
            <FormField
              label="Visibility"
              error={errors.status}
              hint="Only published titles appear in the shop."
            >
              {(props) => (
                <select
                  {...props}
                  value={f.status}
                  onChange={set('status')}
                  className={cn(props.className, 'cursor-pointer font-semibold')}
                >
                  {BOOK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
        </Section>

        <Section title="Shop copy">
          <FormField
            label="Shop blurb"
            error={errors.blurb}
            hint="One warm sentence, in our voice."
          >
            {(props) => (
              <textarea
                {...props}
                value={f.blurb}
                onChange={set('blurb')}
                rows={4}
                placeholder="Why we love it…"
                className={cn(props.className, 'resize-y font-sans')}
              />
            )}
          </FormField>
        </Section>

        <FormError message={formError} />

        <div className="flex flex-wrap gap-3 border-t border-mist pt-5">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="btn-primary px-[26px] py-[13px] text-sm"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add to shelf'}
          </button>
          <Link
            href="/admin/books"
            className="btn-quiet px-[22px] py-[13px] text-sm no-underline hover:no-underline"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
