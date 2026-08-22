// src/components/admin/order-detail-client.tsx
'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { useGetOrderQuery, useUpdateOrderStatusMutation } from '@/redux/catalog-api';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { fmtCedis, fmtDate, fmtTime } from '@/lib/format';
import { extractApiError } from '@/utils/extract-api-error';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { shelfColor, coverUrl, type OrderStatus } from '@/data/catalog';
import { isNotFound, refetchDim } from './api-helpers';

const STEPS: OrderStatus[] = ['Pending', 'Paid', 'Shipped', 'Delivered'];

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="max-w-[860px]">
      <Skeleton className="mb-4 h-4 w-24" />
      <Skeleton className="mb-[22px] h-9 w-64" />
      <div className="glass mb-4 px-6 py-5">
        <Skeleton className="mb-4 h-3 w-24" />
        <Skeleton className="mb-4 h-10 w-full max-w-[420px]" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="glass flex-[1_1_320px] px-6 py-5">
          <Skeleton className="mb-4 h-3 w-16" />
          <Skeleton className="mb-3 h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="glass flex-[1_1_260px] px-6 py-5">
          <Skeleton className="mb-4 h-3 w-20" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetOrderQuery(orderId);
  const [updateStatus, { isLoading: mutating }] = useUpdateOrderStatusMutation();

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          title="We can't find that order."
          description="It may have been removed, or the link is wrong."
          action={{ label: '← All orders', href: '/admin/orders', variant: 'dark' }}
          className="mx-auto mt-10 max-w-[560px]"
        />
      );
    }
    return (
      <div className="mx-auto mt-10 max-w-[560px]">
        <ErrorState title="Couldn't load this order" onRetry={() => void refetch()} />
      </div>
    );
  }

  const order = data!.data;
  const cancelled = order.status === 'Cancelled';
  const idx = STEPS.indexOf(order.status);
  const canAdvance = !cancelled && idx >= 0 && idx < 3;
  /** Anything past Pending has money against it, so cancelling means refunding. */
  const paid = !cancelled && order.status !== 'Pending';

  const runStatus = async (
    action: 'advance' | 'set' | 'cancel' | 'reinstate',
    status?: OrderStatus,
  ) => {
    try {
      const res = await updateStatus({
        id: order.id,
        action,
        ...(status && status !== 'Cancelled'
          ? { status: status as 'Pending' | 'Paid' | 'Shipped' | 'Delivered' }
          : {}),
      }).unwrap();
      notify(res.message);
    } catch (err) {
      // Surfaces the server's reason - a declined Paystack refund included,
      // so the admin learns why a cancel was refused.
      notify(extractApiError(err).message);
    }
  };

  const advance = () => {
    const next = STEPS[idx + 1];
    confirm({
      title: `Mark ${order.id} as ${next}?`,
      description: `The order will move from ${order.status} to ${next}. The customer sees this status on their account and is notified by email and SMS.`,
      confirmText: `Mark as ${next}`,
      onConfirm: () => runStatus('advance'),
    });
  };

  const setStatus = (next: OrderStatus) => {
    if (next === order.status) return;
    confirm({
      title: `Set ${order.id} to ${next}?`,
      description: `This moves the order straight from ${order.status} to ${next} and notifies the customer.`,
      confirmText: `Set to ${next}`,
      onConfirm: () => runStatus('set', next),
    });
  };

  const onCancel = () =>
    confirm({
      title: 'Cancel this order?',
      description: paid
        ? `${order.id} was paid, so the Paystack payment will be REFUNDED before the order is cancelled. If the refund is declined the order stays as it is. Copies return to stock.`
        : `${order.id} will be marked as cancelled. Nothing was charged, so there is no refund to make.`,
      confirmText: 'Cancel order',
      isDestructive: true,
      onConfirm: () => runStatus('cancel'),
    });

  const onReinstate = () =>
    confirm({
      title: `Reinstate ${order.id}?`,
      description:
        'The order returns to the status it held before cancellation and its copies come back off the shelf. If stock has since run out, the reinstatement is refused.',
      confirmText: 'Reinstate order',
      onConfirm: () => runStatus('reinstate'),
    });

  return (
    <div className={cn('max-w-[860px] animate-fade-up', refetchDim(isFetching, isLoading))}>
      <Link
        href="/admin/orders"
        className="mb-4 inline-block text-[13px] font-bold text-sage hover:text-pine hover:no-underline"
      >
        ← All orders
      </Link>
      <div className="mb-[22px] flex flex-wrap items-center gap-3.5">
        <h1 className="m-0 font-serif text-[32px] font-normal">Order {order.id}</h1>
        <StatusPill status={order.status} className="px-3.5 py-1.5 text-xs" />
        <span className="text-[13px] font-medium text-sage">
          Placed {fmtDate(order.date)}
          {fmtTime(order.date) && `, ${fmtTime(order.date)}`}
        </span>
      </div>

      {/* Fulfilment */}
      <div className="glass mb-4 px-6 py-5">
        <div className="mb-3.5 text-xs font-bold tracking-[0.16em] text-sage uppercase">Fulfilment</div>
        {/* Left-aligned stepper: the first dot starts flush with the heading
            and the action buttons; connectors run only BETWEEN steps. */}
        <div className="mb-4 flex items-start">
          {STEPS.map((step, i) => {
            const done = !cancelled && i <= idx;
            return (
              <Fragment key={step}>
                {i > 0 && (
                  <div
                    className="mx-2 mt-2.5 h-0.5 min-w-3 flex-1"
                    style={{ background: done ? '#2E6B4F' : '#DCE3D8' }}
                    aria-hidden="true"
                  />
                )}
                <div className="flex shrink-0 flex-col items-start gap-[7px]">
                  <div
                    className="box-border flex h-[22px] w-[22px] items-center justify-center border-2 text-[11px] font-bold"
                    style={{
                      background: done ? '#2E6B4F' : '#F3F6F0',
                      borderColor: done ? '#2E6B4F' : '#DCE3D8',
                      color: done ? '#F1F6EF' : '#6A7A66',
                    }}
                  >
                    {done ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                  </div>
                  <div className="text-[11.5px] font-semibold" style={{ color: done ? '#1C2A21' : '#6A7A66' }}>
                    {step}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canAdvance && (
            <button
              type="button"
              onClick={advance}
              disabled={mutating}
              className="btn-primary px-5 py-[11px] text-[13.5px] shadow-none"
            >
              {mutating ? 'Updating…' : `Mark as ${STEPS[idx + 1]}`}
            </button>
          )}
          {!cancelled && (
            <label className="flex items-center gap-2 text-[12.5px] font-bold text-sage">
              <span className="sr-only sm:not-sr-only">Change status</span>
              <select
                value={order.status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                disabled={mutating}
                className="input-glass h-11 cursor-pointer px-3 text-[13px] font-semibold text-ink"
              >
                {STEPS.map((step) => (
                  <option key={step} value={step}>
                    {step}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!cancelled && (
            <button
              type="button"
              onClick={onCancel}
              disabled={mutating}
              className="btn-outline-rust px-[18px] py-[11px] text-[13px]"
            >
              Cancel order
            </button>
          )}
          {cancelled && (
            <button
              type="button"
              onClick={onReinstate}
              disabled={mutating}
              className="btn-primary px-5 py-[11px] text-[13.5px] shadow-none"
            >
              {mutating ? 'Updating…' : 'Reinstate order'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {/* Items */}
        <div className="glass flex-[1_1_320px] px-6 py-5">
          <div className="mb-3.5 text-xs font-bold tracking-[0.16em] text-sage uppercase">Items</div>
          <div className="mb-4 flex flex-col gap-3">
            {order.lines.map((line) => (
              <div key={line.bookId} className="flex items-center gap-3">
                <div
                  className="relative h-[51px] flex-[0_0_34px] overflow-hidden"
                  style={{ background: shelfColor(line.genre) }}
                >
                  {line.isbn && (
                    // eslint-disable-next-line @next/next/no-img-element -- Open Library cover with color fallback
                    <img
                      src={coverUrl(line.isbn, 'M')}
                      alt=""
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{line.title}</div>
                  <div className="text-xs text-sage">
                    {line.author} · × {line.qty}
                  </div>
                </div>
                {/* Price snapshot at purchase time, not the current shelf price. */}
                <div className="text-[13.5px] font-bold">{fmtCedis(line.unitPrice * line.qty)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between border-t border-mist pt-3 text-base font-bold">
            <span>Total</span>
            <span>{fmtCedis(order.total)}</span>
          </div>
          <div className="mt-1.5 text-xs font-medium text-pine">
            {cancelled ? 'Refunded via Paystack.' : `Paid via Paystack · ref PSK-${order.id.slice(3)}-GH`}
          </div>
        </div>

        {/* Customer */}
        <div className="glass flex-[1_1_260px] px-6 py-5">
          <div className="mb-3.5 text-xs font-bold tracking-[0.16em] text-sage uppercase">Customer</div>
          <div className="mb-1 text-[15px] font-bold">{order.name}</div>
          <div className="text-[13.5px] leading-[1.8] text-moss">
            {order.email}
            <br />
            {order.phone}
            <br />
            {order.address}
            <br />
            {order.city}, Ghana
          </div>
        </div>
      </div>
      {dialog}
    </div>
  );
}
