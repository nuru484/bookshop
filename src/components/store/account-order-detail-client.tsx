// src/components/store/account-order-detail-client.tsx
'use client';

import Link from 'next/link';
import { fmtCedis, fmtDate, fmtTime } from '@/lib/format';
import { extractApiError } from '@/utils/extract-api-error';
import { useGetMyOrderQuery } from '@/redux/catalog-api';
import { useHydrated } from '@/hooks/use-hydrated';
import { BookCover } from '@/components/ui/BookCover';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderStatusSteps } from './order-status-steps';

const EYEBROW = 'mb-3.5 text-xs font-bold tracking-[0.16em] text-sage uppercase';

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

export function AccountOrderDetailClient({ orderId }: { orderId: string }) {
  const hydrated = useHydrated();

  const { data, isLoading, isError, error, refetch } = useGetMyOrderQuery(
    orderId.toUpperCase(),
    { skip: !hydrated },
  );
  const order = data?.data;

  const back = (
    <Link
      href="/account"
      className="mb-5 inline-block text-[13px] font-bold text-sage no-underline hover:text-pine hover:no-underline"
    >
      ← My account
    </Link>
  );

  if (!hydrated || isLoading) {
    return (
      <section className="mx-auto w-full max-w-[720px] pt-10 pb-16">
        {back}
        <DetailSkeleton />
      </section>
    );
  }

  if (isError || !order) {
    const status = extractApiError(error).status;
    return (
      <section className="animate-fade-up mx-auto w-full max-w-[720px] pt-10 pb-16">
        {back}
        {status === 404 ? (
          <EmptyState
            title="We couldn't find that order"
            description="It may belong to a different account, or the link is out of date."
            action={{ label: 'Back to my account', href: '/account', variant: 'dark' }}
          />
        ) : status === 401 ? (
          <EmptyState
            title="Sign in to view this order"
            description="Order details are only visible to the account that placed them."
            action={{ label: 'Go to sign in', href: '/account', variant: 'primary' }}
          />
        ) : (
          <ErrorState title="Couldn't load this order" onRetry={() => void refetch()} />
        )}
      </section>
    );
  }

  return (
    <section className="animate-fade-up mx-auto w-full max-w-[720px] pt-10 pb-16">
      {back}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-serif text-[32px] font-normal">Order {order.id}</h1>
        <StatusPill status={order.status} className="px-3 py-[5px] text-[11.5px]" />
        <span className="text-[13px] font-medium text-sage">
          Placed {fmtDate(order.date)}
          {fmtTime(order.date) && `, ${fmtTime(order.date)}`}
        </span>
      </div>

      {/* Fulfilment */}
      <div className="glass mb-4 px-5 py-6 sm:px-7">
        <div className={EYEBROW}>Fulfilment</div>
        <OrderStatusSteps status={order.status} />
      </div>

      {/* Items */}
      <div className="glass mb-4 px-5 py-6 sm:px-7">
        <div className={EYEBROW}>In the parcel</div>
        <div className="flex flex-col gap-4">
          {order.lines.map((line) => (
            <div key={line.bookId} className="flex items-start gap-3.5">
              <div className="w-[56px] shrink-0 shadow-[0_6px_14px_rgba(18,30,23,0.18)]">
                <BookCover
                  book={{
                    title: line.title,
                    author: line.author,
                    isbn: line.isbn,
                    genre: line.genre,
                  }}
                  size="M"
                  fallback="tiny"
                  showAuthor={false}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-serif text-[16px] leading-tight text-ink">
                  {line.title}
                </div>
                <div className="mt-0.5 truncate text-[12.5px] font-medium text-sage">
                  {line.author}
                </div>
                <div className="mt-1 text-[13px] text-moss">
                  {line.qty} × {fmtCedis(line.unitPrice)}
                </div>
              </div>
              <div className="shrink-0 text-[14.5px] font-bold text-ink">
                {fmtCedis(line.unitPrice * line.qty)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-mist pt-3.5 text-[16px] font-bold text-ink">
          <span>Total</span>
          <span>{fmtCedis(order.total)}</span>
        </div>
        <div className="mt-1.5 text-xs font-medium text-pine">
          {order.status === 'Cancelled' ? 'Refunded via Paystack.' : 'Paid via Paystack.'}
        </div>
      </div>

      {/* Delivery */}
      <div className="glass px-5 py-6 sm:px-7">
        <div className={EYEBROW}>Delivery details</div>
        <div className="text-[14px] leading-[1.8] text-moss">
          <span className="font-bold text-ink">{order.name}</span>
          <br />
          {order.phone}
          <br />
          {order.address}
          <br />
          {order.city}, Ghana
        </div>
      </div>
    </section>
  );
}
