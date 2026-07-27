// src/components/admin/customer-detail-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGetCustomerQuery } from '@/redux/catalog-api';
import { fmtCedis, fmtDate, initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, StatsSkeleton } from '@/components/ui/Skeleton';
import { statValueCls } from './derive';
import { DateTimeCell } from './table/date-time-cell';
import { isNotFound, refetchDim } from './api-helpers';

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="max-w-[980px]">
      <Skeleton className="mb-[18px] h-4 w-28" />
      <div className="mb-5 flex items-center gap-[18px]">
        <Skeleton className="h-[58px] w-[58px]" />
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-2 h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <StatsSkeleton />
    </div>
  );
}

export default function CustomerDetailClient({ email }: { email: string }) {
  const router = useRouter();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetCustomerQuery(email);

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          title="We don't know this reader yet."
          description="No orders or account found for that customer."
          action={{ label: '← All customers', href: '/admin/customers', variant: 'dark' }}
          className="mx-auto mt-10 max-w-[560px]"
        />
      );
    }
    return (
      <div className="mx-auto mt-10 max-w-[560px]">
        <ErrorState title="Couldn't load this customer" onRetry={() => void refetch()} />
      </div>
    );
  }

  const customer = data!.data;
  const { stats } = customer;

  const statCards = [
    { label: 'Orders', value: String(stats.orders) },
    { label: 'Lifetime spend', value: fmtCedis(stats.spent) },
    { label: 'Avg order', value: fmtCedis(stats.avgOrder) },
    { label: 'Last order', value: stats.lastOrder ? fmtDate(stats.lastOrder) : '-' },
  ];

  return (
    <div className={cn('max-w-[980px] animate-fade-up', refetchDim(isFetching, isLoading))}>
      <Link
        href="/admin/customers"
        className="mb-[18px] inline-block text-[13px] font-bold text-sage hover:text-pine hover:no-underline"
      >
        ← All customers
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-[18px]">
        <div className="flex h-[58px] w-[58px] items-center justify-center bg-pine text-xl font-bold text-cream-bright">
          {initials(customer.name)}
        </div>
        <div className="min-w-0">
          <h1 className="m-0 flex flex-wrap items-center gap-2.5 font-serif text-[32px] font-normal">
            <span className="min-w-0 truncate">{customer.name}</span>
            {customer.hasAccount && (
              <span className="bg-fern-pale px-2.5 py-1 font-sans text-[11px] font-bold tracking-[0.06em] text-fern">
                Account
              </span>
            )}
          </h1>
          <div className="mt-1 text-[13.5px] font-medium text-sage">
            {customer.email}
            {customer.phone && ` · ${customer.phone}`}
            {customer.since && ` · customer since ${fmtDate(customer.since)}`}
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

      <div className="mb-5 flex flex-wrap gap-3.5">
        <div className="glass flex-[1_1_260px] px-[22px] py-5">
          <div className="mb-3 text-xs font-bold tracking-[0.16em] text-sage uppercase">Delivery address</div>
          <div className="text-sm leading-[1.8] text-moss">
            {customer.address || '-'}
            <br />
            {customer.city ? `${customer.city}, Ghana` : 'Ghana'}
            <br />
            {customer.phone || '-'}
          </div>
        </div>
        <div className="glass flex-[1_1_260px] px-[22px] py-5">
          <div className="mb-3 text-xs font-bold tracking-[0.16em] text-sage uppercase">Reader profile</div>
          <div className="text-sm leading-[1.8] text-moss">
            Favourite shelf: <strong>{customer.favGenre}</strong>
            <br />
            Most recent title: {customer.lastTitle}
            <br />
            Account: {customer.hasAccount ? 'registered on the storefront' : 'guest checkout only'}
          </div>
        </div>
      </div>

      <div className="glass px-[22px] py-5">
        <div className="mb-2.5 text-sm font-bold">Order history</div>
        <div className="flex flex-col">
          {customer.orders.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/admin/orders/${o.id}`)}
              className="flex cursor-pointer flex-wrap items-center gap-3.5 border-t border-pale px-1.5 py-[11px] hover:bg-pine/6"
            >
              <span className="flex-[0_0_76px] text-[13px] font-bold">{o.id}</span>
              <span className="flex-[0_0_92px]">
                <DateTimeCell iso={o.date} />
              </span>
              <span className="min-w-0 flex-[1_1_150px] overflow-hidden text-[13px] font-medium text-ellipsis whitespace-nowrap">
                {o.summary}
              </span>
              <StatusPill status={o.status} />
              <span className="ml-auto text-[13.5px] font-bold">{fmtCedis(o.total)}</span>
            </div>
          ))}
        </div>
        {customer.orders.length === 0 && (
          <div className="pt-2 text-[13px] text-sage">No orders yet - the account was created without one.</div>
        )}
      </div>
    </div>
  );
}
