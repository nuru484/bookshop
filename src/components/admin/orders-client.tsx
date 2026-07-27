// src/components/admin/orders-client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useGetOrdersQuery } from '@/redux/catalog-api';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { fmtDate, fmtTime } from '@/lib/format';
import { StatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import type { IOrderWithTotal } from '@/types/catalog-api';
import { PageHeader } from './page-header';
import {
  DataTable,
  RowCard,
  RowCardBody,
  useServerTable,
  type ColumnDef,
  type SortState,
} from './table/data-table';
import { TableToolbar } from './table/table-toolbar';
import { DateRangeFields } from './table/date-range-fields';
import { DateTimeCell } from './table/date-time-cell';
import { ActiveFilterChips } from './table/active-filters';
import { TablePagination } from './table/table-pagination';
import { ListPageFrame } from './table/list-page';
import { MoneyCell, TitleWithSubtitle } from './table/cells';
import { NewOrderModal } from './new-order-modal';
import { dirParam } from './api-helpers';

const STATUS_CHIPS = ['All', 'Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'] as const;

const itemCount = (o: IOrderWithTotal): number => o.items.reduce((s, i) => s + i.qty, 0);

const DEFAULT_SORT: SortState = { key: 'date', dir: -1 };

export default function OrdersClient() {
  const router = useRouter();

  const urlState = useTableUrlState({ filterKeys: ['status', 'from', 'to'] });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [creating, setCreating] = useState(false);

  const { filters, setFilters, clearFilters, search, setSearch } = urlState;

  const { data, isLoading, isFetching, isError, refetch } = useGetOrdersQuery({
    page: urlState.page,
    limit: urlState.pageSize,
    search: search || undefined,
    status: filters.status,
    from: filters.from,
    to: filters.to,
    sort: sort.key,
    dir: dirParam(sort.dir),
  });

  const orders = data?.data ?? [];
  const table = useServerTable<IOrderWithTotal>({
    rows: orders,
    meta: data?.meta,
    urlState,
    defaultSort: DEFAULT_SORT,
    sortState: sort,
    onSortChange: setSort,
  });

  const status = filters.status ?? 'All';
  const dateActive = Boolean(filters.from || filters.to);
  const filterCount = (filters.status ? 1 : 0) + (dateActive ? 1 : 0);

  const columns: ColumnDef<IOrderWithTotal>[] = [
    {
      key: 'id',
      header: 'Order',
      width: 'flex-[0_0_80px]',
      cell: (o) => <span className="text-[13px] font-bold">{o.id}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      width: 'flex-[0_0_128px]',
      cell: (o) => <DateTimeCell iso={o.date} />,
    },
    {
      key: 'customer',
      header: 'Customer',
      width: 'flex-[1_1_160px] min-w-0',
      cell: (o) => <TitleWithSubtitle title={o.name} subtitle={o.city} />,
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      width: 'flex-[0_0_70px]',
      hideBelow: 'lg',
      cell: (o) => <span className="text-[13px] font-semibold text-moss">{itemCount(o)}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_92px]',
      cell: (o) => <MoneyCell amount={o.total} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      width: 'flex-[0_0_100px]',
      cell: (o) => <StatusPill status={o.status} />,
    },
  ];

  const statusChips = STATUS_CHIPS.map((s) => {
    const count = data?.statusCounts?.[s] ?? 0;
    const active = status === s;
    return (
      <button
        key={s}
        type="button"
        onClick={() => setFilters({ status: s === 'All' ? undefined : s })}
        className="shrink-0 cursor-pointer border-[1.5px] border-pine px-[15px] py-2 text-[12.5px] font-bold whitespace-nowrap"
        style={{
          background: active ? '#2E6B4F' : 'transparent',
          color: active ? '#F1F6EF' : '#2E6B4F',
        }}
      >
        {s} ({count})
      </button>
    );
  });

  const header = <PageHeader title="Orders" subtitle="Every order that has come through the shop." />;

  return (
    <ListPageFrame
      header={header}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRetry={() => void refetch()}
      errorTitle="Couldn't load the orders"
      skeletonRows={urlState.pageSize}
    >
      <DataTable<IOrderWithTotal>
        columns={columns}
        table={table}
        rowKey={(o) => o.id}
        onRowOpen={(o) => router.push(`/admin/orders/${o.id}`)}
        renderRowCard={(o) => (
          <RowCard onOpen={() => router.push(`/admin/orders/${o.id}`)}>
            <RowCardBody
              title={o.name}
              meta={`${o.id} · ${fmtDate(o.date)}, ${fmtTime(o.date)} · ${itemCount(o)} item${itemCount(o) === 1 ? '' : 's'}`}
              value={<MoneyCell amount={o.total} />}
              badge={<StatusPill status={o.status} />}
            />
          </RowCard>
        )}
        toolbar={
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search order # or customer…"
            hasFiltersApplied={urlState.filtersActive}
            filterCount={filterCount}
            onClearAll={clearFilters}
            chipRow={statusChips}
            actions={
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="btn-primary h-11 px-5 text-[13.5px] whitespace-nowrap shadow-none"
              >
                + New order
              </button>
            }
            filterFields={
              <DateRangeFields
                from={filters.from}
                to={filters.to}
                onChange={({ from, to }) => setFilters({ from, to })}
              />
            }
            chips={
              <ActiveFilterChips
                items={[
                  ...(filters.status
                    ? [{ key: 'status', label: `Status: ${filters.status}`, onRemove: () => setFilters({ status: undefined }) }]
                    : []),
                  ...(dateActive
                    ? [{
                        key: 'dates',
                        label: `${filters.from ?? '…'} → ${filters.to ?? 'today'}`,
                        onRemove: () => setFilters({ from: undefined, to: undefined }),
                      }]
                    : []),
                ]}
              />
            }
          />
        }
        pagination={
          <TablePagination
            table={table}
            pageSize={urlState.pageSize}
            onPageChange={urlState.setPage}
            onPageSizeChange={urlState.setPageSize}
            entityLabel="orders"
          />
        }
        emptyState={
          <EmptyState
            title="No orders yet."
            description="Orders placed on the storefront land here, or record a walk-in with New order."
            action={{ label: '+ New order', onClick: () => setCreating(true), variant: 'primary' }}
          />
        }
        entityLabel="orders"
        onClearFilters={clearFilters}
      />
      <NewOrderModal open={creating} onClose={() => setCreating(false)} />
    </ListPageFrame>
  );
}
