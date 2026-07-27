// src/components/admin/dashboard-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { useGetDashboardStatsQuery } from '@/redux/catalog-api';
import { fmtCedis } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, StatsSkeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { IDashboardStats, ITrend } from '@/types/catalog-api';
import { PageHeader } from './page-header';
import { DateTimeCell } from './table/date-time-cell';
import { CATEGORY_COLORS, FUNNEL_COLORS, greeting, kpiValueCls, longDate, shiftIso } from './derive';
import { refetchDim } from './api-helpers';

type Range = '7' | '30' | '90' | 'custom';

const RANGE_CHIPS: [Range, string][] = [
  ['7', '7 days'],
  ['30', '30 days'],
  ['90', '90 days'],
  ['custom', 'Custom'],
];

const NEUTRAL: ITrend = { percentage: 0, direction: 'neutral' };

/**
 * Deep defaults so a field the API has not deployed yet renders as zero
 * instead of blanking the page (the dms withDashboardStatsDefaults lesson).
 */
const withDefaults = (stats?: IDashboardStats): IDashboardStats => ({
  kpis: {
    revenue: 0,
    revenueTrend: NEUTRAL,
    orders: 0,
    ordersTrend: NEUTRAL,
    avgOrder: 0,
    avgOrderTrend: NEUTRAL,
    unitsSold: 0,
    newCustomers: 0,
    newCustomersTrend: NEUTRAL,
    totalCustomers: 0,
    returningBuyers: 0,
    cancelled: 0,
    ...stats?.kpis,
  },
  weeks: stats?.weeks ?? [],
  topTitles: stats?.topTitles ?? [],
  catShare: stats?.catShare ?? [],
  funnel: stats?.funnel ?? [],
  lowStock: { count: 0, threshold: 6, preview: [], ...stats?.lowStock },
  needsAttention: {
    outOfStock: 0,
    lowStock: 0,
    pendingOrders: 0,
    awaitingShipment: 0,
    pendingRefunds: 0,
    draftBooks: 0,
    ...stats?.needsAttention,
  },
  inventory: { titles: 0, published: 0, copies: 0, value: 0, ...stats?.inventory },
  statusCounts: stats?.statusCounts ?? {},
  latestOrders: stats?.latestOrders ?? [],
});

const TREND_STYLE: Record<ITrend['direction'], { arrow: string; color: string }> = {
  upward: { arrow: '↑', color: '#3E5A41' },
  downward: { arrow: '↓', color: '#93381A' },
  neutral: { arrow: '–', color: '#6A7A66' },
};

function TrendFooter({ trend }: { trend: ITrend }) {
  const style = TREND_STYLE[trend.direction];
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-mist pt-2">
      <span className="text-xs font-bold whitespace-nowrap" style={{ color: style.color }}>
        {style.arrow} {trend.percentage}%
      </span>
      <span className="text-[11px] font-medium whitespace-nowrap text-sage">vs previous period</span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  meta,
}: {
  label: string;
  value: string;
  trend?: ITrend;
  meta?: string;
}) {
  return (
    <div className="glass flex min-w-0 flex-col px-5 py-[18px]">
      <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-sage uppercase">{label}</div>
      <div className={cn('font-serif leading-none whitespace-nowrap', kpiValueCls(value))}>{value}</div>
      {meta && <div className="mt-1.5 text-[11.5px] font-medium text-sage">{meta}</div>}
      {trend ? <TrendFooter trend={trend} /> : <div className="flex-1" />}
    </div>
  );
}

interface AttentionItem {
  key: string;
  label: string;
  description: string;
  count: number;
  href: string;
}

function NeedsAttention({ data }: { data: IDashboardStats['needsAttention'] }) {
  const items: AttentionItem[] = [
    {
      key: 'out',
      label: 'Out of stock',
      description: 'Published titles with no copies left',
      count: data.outOfStock,
      href: '/admin/inventory?stock=out',
    },
    {
      key: 'low',
      label: 'Running low',
      description: 'Titles at or below the restock line',
      count: data.lowStock,
      href: '/admin/inventory?stock=low',
    },
    {
      key: 'pending',
      label: 'Pending orders',
      description: 'Baskets awaiting payment',
      count: data.pendingOrders,
      href: '/admin/orders?status=Pending',
    },
    {
      key: 'shipping',
      label: 'Awaiting shipment',
      description: 'Paid and ready to wrap',
      count: data.awaitingShipment,
      href: '/admin/orders?status=Paid',
    },
    {
      key: 'refunds',
      label: 'Refunds outstanding',
      description: 'Cancelled but not yet refunded',
      count: data.pendingRefunds,
      href: '/admin/orders?status=Cancelled',
    },
    {
      key: 'drafts',
      label: 'Unpublished drafts',
      description: 'Titles not yet on the storefront',
      count: data.draftBooks,
      href: '/admin/books?status=Draft',
    },
  ];
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="glass mb-5 px-[22px] py-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold">Needs attention</div>
        <span
          className="px-3 py-1 text-[11px] font-bold tracking-[0.05em]"
          style={{
            background: total === 0 ? '#E4EBDF' : '#F3E7CE',
            color: total === 0 ? '#3E5A41' : '#8A6414',
          }}
        >
          {total === 0 ? '✓ All caught up' : `${total} item${total === 1 ? '' : 's'} to review`}
        </span>
      </div>
      <div className="mb-4 text-xs font-medium text-sage">
        Live counts across the whole shop - not filtered by the date range above.
      </div>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'group flex min-w-0 flex-col border border-mist bg-white/40 px-3.5 py-3 text-ink no-underline transition-colors hover:border-pine hover:no-underline',
              item.count === 0 && 'opacity-55',
            )}
          >
            <span className="font-serif text-[26px] leading-none">{item.count}</span>
            <span className="mt-1.5 truncate text-[12.5px] font-bold">{item.label}</span>
            <span className="mt-0.5 line-clamp-2 text-[11px] text-sage">{item.description}</span>
            <span className="mt-1.5 text-[11px] font-bold text-pine opacity-0 transition-opacity group-hover:opacity-100">
              Review →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true">
      <StatsSkeleton count={6} />
      <div className="glass mt-5 px-[22px] py-5">
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[92px]" />
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3.5">
        <div className="glass min-w-0 flex-[2_1_420px] px-[22px] py-5">
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-44 w-full" />
        </div>
        <div className="glass min-w-0 flex-[1_1_280px] px-[22px] py-5">
          <Skeleton className="mb-4 h-4 w-40" />
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="mb-3 h-5 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const router = useRouter();
  const hydrated = useHydrated();
  const authUser = useAppSelector((s) => s.auth.user);

  const todayIso = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState<Range>('30');
  const [dFrom, setDFrom] = useState(shiftIso(todayIso, -30));
  const [dTo, setDTo] = useState(todayIso);

  const { data, isLoading, isFetching, isError, refetch } = useGetDashboardStatsQuery(
    range === 'custom' ? { range, from: dFrom, to: dTo } : { range },
  );

  const now = new Date();
  const firstName = (hydrated && authUser?.fullname?.trim().split(' ')[0]) || 'there';

  const stats = withDefaults(data?.data);
  const hasData = Boolean(data?.data);
  const { kpis, weeks, inventory } = stats;

  // --- Revenue line chart (weeks can be short - guard the divisions) ---
  const max = Math.max(...weeks.map((w) => w.v), 1);
  const pts = weeks.map((w, i) => [
    weeks.length === 1 ? 300 : i * (600 / Math.max(weeks.length - 1, 1)),
    190 - (w.v / max) * 165,
  ]);
  const revPoints = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const revArea = pts.length > 1 ? `${revPoints} 600,190 0,190` : '';
  const last = pts[pts.length - 1] ?? [0, 190];

  // --- Funnel presentation (real order stages) ---
  const fMax = Math.max(...stats.funnel.map((f) => f.v), 1);
  const funnel = stats.funnel.map((f, i) => ({
    label: f.label,
    value: f.v.toLocaleString(),
    pct: `${Math.max(Math.round((f.v / fMax) * 100), 4)}%`,
    color: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
    rate:
      i === 0
        ? '100%'
        : `${stats.funnel[i - 1].v > 0 ? ((f.v / stats.funnel[i - 1].v) * 100).toFixed(0) : 0}%`,
  }));

  return (
    <div className="animate-fade-up">
      <PageHeader
        className="mb-[22px]"
        title={
          <span suppressHydrationWarning>
            {greeting(now)}, {firstName}
          </span>
        }
        subtitle={
          <span suppressHydrationWarning>{longDate(now)} · Here&apos;s how the shop is reading.</span>
        }
        actions={
          <div className="glass w-full min-w-0 p-2 px-2.5 text-xs font-semibold text-sage md:w-auto">
            <div
              className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: 'thin' }}
            >
              {RANGE_CHIPS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className="shrink-0 cursor-pointer border-[1.5px] border-pine px-[13px] py-[7px] text-xs font-bold whitespace-nowrap"
                  style={{
                    background: range === key ? '#2E6B4F' : 'transparent',
                    color: range === key ? '#F1F6EF' : '#2E6B4F',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {range === 'custom' && (
              <div className="mt-2 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-nowrap">
                <input
                  type="date"
                  value={dFrom}
                  max={dTo || undefined}
                  onChange={(e) => setDFrom(e.target.value)}
                  aria-label="Range start"
                  className="box-border h-9 w-full border border-ink/22 bg-white/60 px-2 text-xs font-semibold text-ink outline-none sm:w-auto"
                />
                <input
                  type="date"
                  value={dTo}
                  min={dFrom || undefined}
                  onChange={(e) => setDTo(e.target.value)}
                  aria-label="Range end"
                  className="box-border h-9 w-full border border-ink/22 bg-white/60 px-2 text-xs font-semibold text-ink outline-none sm:w-auto"
                />
              </div>
            )}
          </div>
        }
      />

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <ErrorState title="Couldn't load the dashboard" onRetry={() => void refetch()} />
      )}

      {hasData && (
        <div className={refetchDim(isFetching, isLoading)}>
          {/* KPIs */}
          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Revenue" value={fmtCedis(kpis.revenue)} trend={kpis.revenueTrend} />
            <KpiCard
              label="Orders"
              value={String(kpis.orders)}
              trend={kpis.ordersTrend}
              meta={kpis.cancelled > 0 ? `${kpis.cancelled} cancelled` : 'None cancelled'}
            />
            <KpiCard
              label="Avg order value"
              value={kpis.avgOrder ? fmtCedis(kpis.avgOrder) : '-'}
              trend={kpis.avgOrderTrend}
            />
            <KpiCard
              label="Units sold"
              value={String(kpis.unitsSold)}
              meta="Copies across paid orders"
            />
            <KpiCard
              label="New customers"
              value={String(kpis.newCustomers)}
              trend={kpis.newCustomersTrend}
            />
            <KpiCard
              label="Total customers"
              value={String(kpis.totalCustomers)}
              meta={`${kpis.returningBuyers} returning buyer${kpis.returningBuyers === 1 ? '' : 's'}`}
            />
          </div>

          <NeedsAttention data={stats.needsAttention} />

          {/* Revenue + top titles */}
          <div className="mb-5 flex flex-wrap gap-3.5">
            <div className="glass min-w-0 flex-[2_1_420px] px-[22px] py-5">
              <div className="mb-3.5 flex items-baseline justify-between gap-2.5">
                <div className="text-sm font-bold">Weekly revenue</div>
                <div className="text-xs font-semibold text-sage">
                  {weeks.length} week{weeks.length === 1 ? '' : 's'} · GH₵
                </div>
              </div>
              {weeks.length > 0 ? (
                <>
                  <svg viewBox="0 0 600 210" className="block h-auto w-full">
                    <line x1="0" y1="190" x2="600" y2="190" stroke="#DCE3D8" strokeWidth="1" />
                    <line x1="0" y1="105" x2="600" y2="105" stroke="#E7EDE4" strokeWidth="1" />
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#E7EDE4" strokeWidth="1" />
                    {revArea && <polygon points={revArea} fill="rgba(46,107,79,.12)" />}
                    <polyline
                      points={revPoints}
                      fill="none"
                      stroke="#2E6B4F"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={last[0].toFixed(1)}
                      cy={last[1].toFixed(1)}
                      r="5"
                      fill="#2E6B4F"
                      stroke="#FFFFFF"
                      strokeWidth="2.5"
                    />
                  </svg>
                  <div className="mt-1.5 flex justify-between text-[10.5px] font-semibold text-sage">
                    <span>{weeks[0]?.w}</span>
                    <span>{weeks.length > 2 ? weeks[Math.floor((weeks.length - 1) / 2)]?.w : ''}</span>
                    <span>{weeks.length > 1 ? weeks[weeks.length - 1]?.w : ''}</span>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-[13px] text-sage">No revenue in this range.</div>
              )}
            </div>
            <div className="glass min-w-0 flex-[1_1_280px] px-[22px] py-5">
              <div className="mb-4 text-sm font-bold">Top titles by copies sold</div>
              <div className="flex flex-col gap-3">
                {stats.topTitles.map((t) => (
                  <div key={t.title}>
                    <div className="mb-[5px] flex justify-between gap-2 text-[12.5px] font-semibold">
                      <span className="truncate">{t.title}</span>
                      <span className="text-sage">{t.sold}</span>
                    </div>
                    <div className="h-[7px] overflow-hidden bg-pale">
                      <div className="h-full bg-pine" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                ))}
                {stats.topTitles.length === 0 && (
                  <div className="text-[13px] text-sage">No sales recorded yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* Shelf share + funnel */}
          <div className="mb-5 flex flex-wrap gap-3.5">
            <div className="glass min-w-0 flex-[1_1_300px] px-[22px] py-5">
              <div className="mb-4 text-sm font-bold">Sales by shelf</div>
              {stats.catShare.length > 0 ? (
                <>
                  <div className="mb-3.5 flex h-3.5 overflow-hidden">
                    {stats.catShare.map((c) => (
                      <div
                        key={c.name}
                        className="h-full"
                        style={{ background: CATEGORY_COLORS[c.name] ?? '#6A7A66', width: `${c.pct}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    {stats.catShare.map((c) => (
                      <div key={c.name} className="flex items-center gap-2 text-[12.5px] font-medium">
                        <span
                          className="h-2.5 w-2.5 shrink-0"
                          style={{ background: CATEGORY_COLORS[c.name] ?? '#6A7A66' }}
                        />
                        <span className="truncate">{c.name}</span>
                        <span className="ml-auto font-bold text-sage">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-[13px] text-sage">No shelf sales yet.</div>
              )}
            </div>
            <div className="glass min-w-0 flex-[1_1_300px] px-[22px] py-5">
              <div className="mb-1 text-sm font-bold">Order funnel</div>
              <div className="mb-4 text-xs font-medium text-sage">
                Basket to doorstep, across the selected range
              </div>
              <div className="flex flex-col gap-2.5">
                {funnel.map((f) => (
                  <div key={f.label}>
                    <div className="mb-[5px] flex justify-between gap-2 text-[12.5px] font-semibold">
                      <span className="truncate">{f.label}</span>
                      <span className="text-sage whitespace-nowrap">
                        {f.value} · {f.rate}
                      </span>
                    </div>
                    <div className="h-4 overflow-hidden bg-pale">
                      <div className="h-full" style={{ background: f.color, width: f.pct }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory snapshot + latest orders */}
          <div className="flex flex-wrap items-start gap-3.5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col bg-ink px-[22px] py-5 text-pale">
              <div className="mb-1 text-sm font-bold text-gold">Inventory snapshot</div>
              <div className="mb-4 text-xs font-medium text-pale/60">
                {stats.lowStock.count} title{stats.lowStock.count === 1 ? '' : 's'} at or below{' '}
                {stats.lowStock.threshold} copies
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Titles', value: String(inventory.titles) },
                  { label: 'Published', value: String(inventory.published) },
                  { label: 'Copies in stock', value: String(inventory.copies) },
                  { label: 'Stock value', value: fmtCedis(inventory.value) },
                ].map((cell) => (
                  <div key={cell.label} className="min-w-0">
                    <div className="text-[10.5px] font-bold tracking-[0.12em] text-pale/55 uppercase">
                      {cell.label}
                    </div>
                    <div className="truncate font-serif text-[22px] leading-tight">{cell.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-1 flex-col gap-[9px]">
                {stats.lowStock.preview.map((b) => (
                  <div key={b.id} className="flex justify-between gap-2.5 text-[13px] font-medium">
                    <span className="truncate">{b.title}</span>
                    <span className="font-bold" style={{ color: b.stock === 0 ? '#E58B72' : '#C2A65A' }}>
                      {b.stock === 0 ? 'out' : `${b.stock} left`}
                    </span>
                  </div>
                ))}
                {stats.lowStock.count === 0 && (
                  <div className="text-[13px] font-medium text-pale/70">Every shelf is healthy.</div>
                )}
              </div>
              <Link
                href="/admin/inventory"
                className="mt-3.5 border-[1.5px] border-pale/35 px-3.5 py-[9px] text-center text-[12.5px] font-bold text-pale no-underline hover:border-gold hover:text-gold hover:no-underline"
              >
                Review inventory →
              </Link>
            </div>

            <div className="glass min-w-0 flex-[2_1_420px] px-[22px] py-5">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="text-sm font-bold">Latest orders</div>
                <Link href="/admin/orders" className="text-[12.5px] font-bold text-pine">
                  All orders →
                </Link>
              </div>
              <div className="flex flex-col">
                {stats.latestOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => router.push(`/admin/orders/${o.id}`)}
                    className="flex cursor-pointer flex-wrap items-center gap-3.5 border-t border-pale px-1.5 py-[11px] hover:bg-pine/7"
                  >
                    <span className="flex-[0_0_76px] text-[13px] font-bold">{o.id}</span>
                    <span className="min-w-0 flex-[1_1_140px] truncate text-[13px] font-medium">
                      {o.name}
                    </span>
                    <span className="flex-[0_0_88px]">
                      <DateTimeCell iso={o.date} />
                    </span>
                    <StatusPill status={o.status} />
                    <span className="ml-auto text-[13.5px] font-bold whitespace-nowrap">
                      {fmtCedis(o.total)}
                    </span>
                  </div>
                ))}
                {stats.latestOrders.length === 0 && (
                  <div className="pt-2 text-[13px] text-sage">No orders yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
