// src/components/admin/book-detail-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetBookQuery, useRestockBookMutation, useUpdateBookMutation } from '@/redux/catalog-api';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { fmtCedis, stars, yearLabel } from '@/lib/format';
import { extractApiError } from '@/utils/extract-api-error';
import { cn } from '@/lib/utils';
import { StatusPill, StockLevelPill } from '@/components/ui/StatusPill';
import { BookCover } from '@/components/ui/BookCover';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, StatsSkeleton } from '@/components/ui/Skeleton';
import { statValueCls } from './derive';
import { DateTimeCell } from './table/date-time-cell';
import { isNotFound, refetchDim } from './api-helpers';
import { bookStatusPill, statusActions } from './book-status';
import type { BookStatus } from '@/data/catalog';

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="max-w-[980px]">
      <Skeleton className="mb-[18px] h-4 w-24" />
      <div className="mb-5 flex flex-wrap gap-[30px]">
        <Skeleton className="aspect-2/3 w-[180px]" />
        <div className="min-w-[260px] flex-[1_1_340px]">
          <Skeleton className="mb-2 h-3 w-32" />
          <Skeleton className="mb-2 h-9 w-3/4" />
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="mb-4 h-7 w-52" />
          <Skeleton className="h-16 w-full max-w-[480px]" />
        </div>
      </div>
      <StatsSkeleton />
    </div>
  );
}

export default function BookDetailClient({ bookId }: { bookId: number }) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetBookQuery(bookId);
  const [restockBook, { isLoading: restocking }] = useRestockBookMutation();
  const [updateBook, { isLoading: updatingStatus }] = useUpdateBookMutation();

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
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

  const book = data!.data;
  const ordersWith = book.ordersWith;

  const statCards = [
    { label: 'Copies sold', value: String(book.sold || 0) },
    { label: 'Revenue, all time', value: fmtCedis((book.sold || 0) * book.price) },
    { label: 'In stock', value: String(book.stock) },
    { label: 'Sells per week', value: `~${Math.max(Math.round((book.sold || 0) / 30), 1)}` },
  ];

  const restock = () =>
    confirm({
      title: `Order 20 more copies of "${book.title}"?`,
      description: `Stock will go from ${book.stock} to ${book.stock + 20} copies.`,
      confirmText: 'Restock +20',
      onConfirm: async () => {
        try {
          const res = await restockBook({ id: book.id }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  const onChangeStatus = (status: BookStatus) =>
    confirm({
      title:
        status === 'Published'
          ? `Publish "${book.title}"?`
          : status === 'Draft'
            ? `Move "${book.title}" to draft?`
            : `Archive "${book.title}"?`,
      description:
        status === 'Published'
          ? 'It will appear on the storefront again.'
          : 'It will disappear from the storefront until published again.',
      confirmText: status === 'Published' ? 'Publish' : status === 'Draft' ? 'Move to draft' : 'Archive',
      onConfirm: async () => {
        try {
          const res = await updateBook({ id: book.id, body: { status } }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  return (
    <div className={cn('max-w-[980px] animate-fade-up', refetchDim(isFetching, isLoading))}>
      <Link
        href="/admin/books"
        className="mb-[18px] inline-block text-[13px] font-bold text-sage hover:text-pine hover:no-underline"
      >
        ← All books
      </Link>
      <div className="mb-5 flex flex-wrap gap-[30px]">
        <div className="flex-[0_0_180px]">
          <BookCover book={book} fallback="large" showAuthor={false} className="shadow-[0_16px_36px_rgba(18,30,23,0.22)]" />
        </div>
        <div className="min-w-[260px] flex-[1_1_340px]">
          <div className="mb-2 text-[11px] font-bold tracking-[0.22em] text-pine uppercase">
            {book.genre} · {yearLabel(book.year)}
          </div>
          <h1 className="m-0 mb-1 font-serif text-[34px] font-normal">{book.title}</h1>
          <div className="mb-3 text-[15px] font-medium text-sage">by {book.author}</div>
          <div className="mb-3.5 flex flex-wrap items-center gap-3.5">
            <span className="text-2xl font-bold">{fmtCedis(book.price)}</span>
            <StockLevelPill stock={book.stock} />
            {bookStatusPill(book.status)}
            <span className="text-[13.5px] text-gold">
              {stars(book.rating)} <span className="text-sage">{book.rating}</span>
            </span>
          </div>
          <p className="m-0 mb-3.5 max-w-[56ch] text-[14.5px] leading-[1.65] text-moss">{book.blurb}</p>
          <div className="mb-[18px] text-[12.5px] text-sage">
            ISBN {book.isbn || '-'} · {book.pages} pages · paperback
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href={`/admin/books/${book.id}/edit`}
              className="btn-primary px-6 py-3 text-[13.5px] no-underline shadow-none hover:no-underline"
            >
              Edit book
            </Link>
            <button
              type="button"
              onClick={restock}
              disabled={restocking}
              className="btn-outline-ink px-5 py-3 text-[13px]"
            >
              {restocking ? 'Restocking…' : 'Restock +20'}
            </button>
            {statusActions(book.status).map((a) => (
              <button
                key={a.status}
                type="button"
                onClick={() => onChangeStatus(a.status)}
                disabled={updatingStatus}
                className="btn-quiet px-4 py-3 text-[13px]"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5">
        {statCards.map((s) => (
          <div key={s.label} className="glass min-w-0 px-[18px] py-4">
            <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.14em] text-sage uppercase">{s.label}</div>
            <div className={cn('font-serif leading-none whitespace-nowrap', statValueCls(s.value))}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="glass px-[22px] py-5">
        <div className="mb-2.5 text-sm font-bold">Orders containing this title</div>
        <div className="flex flex-col">
          {ordersWith.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/admin/orders/${o.id}`)}
              className="flex cursor-pointer flex-wrap items-center gap-3.5 border-t border-pale px-1.5 py-[11px] hover:bg-pine/6"
            >
              <span className="flex-[0_0_76px] text-[13px] font-bold">{o.id}</span>
              <span className="flex-[1_1_140px] text-[13px] font-medium">{o.name}</span>
              <span className="flex items-center gap-1.5">
                <DateTimeCell iso={o.date} />
                <span className="text-[12.5px] text-sage">· × {o.qty}</span>
              </span>
              <StatusPill status={o.status} className="ml-auto" />
            </div>
          ))}
        </div>
        {ordersWith.length === 0 && (
          <div className="pt-2 text-[13px] text-sage">No recorded orders for this title yet.</div>
        )}
      </div>
      {dialog}
    </div>
  );
}
