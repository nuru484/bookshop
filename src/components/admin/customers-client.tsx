// src/components/admin/customers-client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { useCreateCustomerMutation, useGetCustomersQuery } from '@/redux/catalog-api';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { fmtDate, avatarColor, AVATAR_COLORS } from '@/lib/format';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { ICustomerSummary } from '@/types/catalog-api';
import { PageHeader } from './page-header';
import { FormError, FormField, useFieldErrors } from './form-field';
import { DateTimeCell } from './table/date-time-cell';
import {
  DataTable,
  RowCard,
  RowCardBody,
  useServerTable,
  type ColumnDef,
  type SortState,
} from './table/data-table';
import { TableToolbar, toolbarSelectCls } from './table/table-toolbar';
import { DateRangeFields } from './table/date-range-fields';
import { ActiveFilterChips } from './table/active-filters';
import { TablePagination } from './table/table-pagination';
import { ListPageFrame } from './table/list-page';
import { AvatarCell, MoneyCell, TitleWithSubtitle } from './table/cells';
import { dirParam } from './api-helpers';

const DEFAULT_SORT: SortState = { key: 'spent', dir: -1 };

/** Stable avatar color per customer, independent of page/order. */
const emailColor = (email: string): string =>
  avatarColor([...email].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_COLORS.length);

const PASSWORD_OK = (pw: string): boolean =>
  pw.length >= 5 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw);

function AddCustomerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const [createCustomer, { isLoading }] = useCreateCustomerMutation();

  const BLANK = { fullname: '', email: '', password: '', phone: '', address: '', city: '' };
  const [f, setF] = useState(BLANK);
  const [showPw, setShowPw] = useState(false);
  const { errors, setErrors, formError, setFormError, clearField, reset, applyServerError } =
    useFieldErrors<keyof typeof BLANK>();

  // Reset whenever the modal reopens (prev-prop pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setF(BLANK);
      reset();
      setShowPw(false);
    }
  }

  const set = (key: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setF((cur) => ({ ...cur, [key]: e.target.value }));
    clearField(key);
  };

  const submit = async () => {
    const next: Partial<Record<keyof typeof BLANK, string>> = {};
    if (f.fullname.trim().length < 2) next.fullname = 'Enter the customer\u2019s full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) next.email = 'Enter a valid email address.';
    if (!PASSWORD_OK(f.password))
      next.password = 'At least 5 characters with upper, lower, number and symbol.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }
    try {
      const res = await createCustomer({
        fullname: f.fullname.trim(),
        email: f.email.trim(),
        password: f.password,
        phone: f.phone.trim() || undefined,
        address: f.address.trim() || undefined,
        city: f.city.trim() || undefined,
      }).unwrap();
      notify(res.message);
      onClose();
    } catch (e) {
      // A duplicate account comes back naming the email.
      const message = applyServerError(e);
      if (/email/i.test(message)) {
        setErrors({ email: message });
        setFormError('');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="mb-1 font-serif text-2xl font-normal text-ink">
        Add a customer
      </h2>
      <p className="mb-4 text-[13px] text-sage">
        Creates a customer account they can sign in with on the storefront.
      </p>
      <div className="flex flex-col gap-3.5">
        <FormField label="Full name" error={errors.fullname}>
          {(props) => (
            <input {...props} value={f.fullname} onChange={set('fullname')} placeholder="Ama Mensah" />
          )}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(props) => (
            <input {...props} type="email" value={f.email} onChange={set('email')} placeholder="ama@example.com" />
          )}
        </FormField>
        <FormField label="Password" error={errors.password}>
          {(props) => (
            <div className="relative">
              <input
                {...props}
                type={showPw ? 'text' : 'password'}
                value={f.password}
                onChange={set('password')}
                placeholder="min 5 with upper, lower, number, symbol"
                className={cn(props.className, 'w-full pr-[68px]')}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-none bg-transparent p-2 text-xs font-bold text-sage hover:text-pine"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </FormField>
        <div className="grid grid-cols-2 gap-3.5">
          <FormField label="Phone" error={errors.phone}>
            {(props) => (
              <input {...props} value={f.phone} onChange={set('phone')} placeholder="024 555 0182" />
            )}
          </FormField>
          <FormField label="City" error={errors.city}>
            {(props) => <input {...props} value={f.city} onChange={set('city')} placeholder="Tamale" />}
          </FormField>
        </div>
        <FormField label="Address" error={errors.address}>
          {(props) => (
            <input {...props} value={f.address} onChange={set('address')} placeholder="Aboabo Market Road" />
          )}
        </FormField>
        <FormError message={formError} />
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-quiet px-5 py-2.5 text-[13px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isLoading}
            className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
          >
            {isLoading ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function CustomersClient() {
  const router = useRouter();

  const urlState = useTableUrlState({ filterKeys: ['city', 'from', 'to'] });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [adding, setAdding] = useState(false);

  const { filters, setFilters, clearFilters, search, setSearch } = urlState;

  const { data, isLoading, isFetching, isError, refetch } = useGetCustomersQuery({
    page: urlState.page,
    limit: urlState.pageSize,
    search: search || undefined,
    city: filters.city,
    from: filters.from,
    to: filters.to,
    sort: sort.key,
    dir: dirParam(sort.dir),
  });

  const customers = data?.data ?? [];
  const cities = data?.cities ?? [];

  const table = useServerTable<ICustomerSummary>({
    rows: customers,
    meta: data?.meta,
    urlState,
    defaultSort: DEFAULT_SORT,
    sortState: sort,
    onSortChange: setSort,
  });

  const dateActive = Boolean(filters.from || filters.to);
  const filterCount = (filters.city ? 1 : 0) + (dateActive ? 1 : 0);

  const open = (c: ICustomerSummary) => router.push(`/admin/customers/${encodeURIComponent(c.email)}`);

  const avatar = (c: ICustomerSummary, size = 34) => (
    <AvatarCell name={c.name} color={emailColor(c.email)} size={size} />
  );

  const accountPill = (c: ICustomerSummary) =>
    c.hasAccount ? (
      <span className="bg-fern-pale px-1.5 py-px text-[10px] font-bold tracking-[0.04em] whitespace-nowrap text-fern">
        Account
      </span>
    ) : null;

  const columns: ColumnDef<ICustomerSummary>[] = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      width: 'flex-[1_1_200px] min-w-0',
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-3">
          {avatar(c)}
          <TitleWithSubtitle title={c.name} titleExtra={accountPill(c)} subtitle={c.email} />
        </span>
      ),
    },
    {
      key: 'city',
      header: 'City',
      width: 'flex-[0_0_100px]',
      hideBelow: 'lg',
      cell: (c) => <span className="text-[13px] font-medium text-moss">{c.city || '-'}</span>,
    },
    {
      key: 'count',
      header: 'Orders',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_70px]',
      cell: (c) => <span className="text-[13px] font-semibold">{c.count}</span>,
    },
    {
      key: 'spent',
      header: 'Spent',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_110px]',
      cell: (c) => <MoneyCell amount={c.spent} />,
    },
    {
      key: 'last',
      header: 'Last order',
      sortable: true,
      align: 'right',
      width: 'flex-[0_0_126px]',
      cell: (c) =>
        c.last ? (
          <DateTimeCell iso={c.last} align="right" />
        ) : (
          <span className="block text-right text-[12.5px] text-sage">-</span>
        ),
    },
  ];

  const header = (
    <PageHeader
      title="Customers"
      subtitle={
        data ? `${data.meta.total} readers, sorted by lifetime spend.` : 'Readers, sorted by lifetime spend.'
      }
    />
  );

  return (
    <ListPageFrame
      header={header}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRetry={() => void refetch()}
      errorTitle="Couldn't load the customers"
      skeletonRows={urlState.pageSize}
    >
      <DataTable<ICustomerSummary>
        columns={columns}
        table={table}
        rowKey={(c) => c.email}
        onRowOpen={open}
        renderRowCard={(c) => (
          <RowCard onOpen={() => open(c)}>
            <RowCardBody
              visual={avatar(c, 34)}
              title={
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{c.name}</span>
                  {accountPill(c)}
                </span>
              }
              meta={c.email}
              value={<MoneyCell amount={c.spent} />}
              badge={
                <span className="text-[11px] whitespace-nowrap text-sage">
                  {c.count} order{c.count === 1 ? '' : 's'}
                  {c.last ? ` · ${fmtDate(c.last)}` : ''}
                </span>
              }
            />
          </RowCard>
        )}
        toolbar={
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, email or city…"
            hasFiltersApplied={urlState.filtersActive}
            filterCount={filterCount}
            onClearAll={clearFilters}
            actions={
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="btn-primary flex h-11 items-center px-5 text-[13.5px] whitespace-nowrap shadow-none"
              >
                + Add customer
              </button>
            }
            filterFields={
              <>
                <select
                  value={filters.city ?? ''}
                  onChange={(e) => setFilters({ city: e.target.value || undefined })}
                  className={toolbarSelectCls}
                >
                  <option value="">All cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <DateRangeFields
                  from={filters.from}
                  to={filters.to}
                  onChange={({ from, to }) => setFilters({ from, to })}
                  fromLabel="Last order from"
                  toLabel="to"
                />
              </>
            }
            chips={
              <ActiveFilterChips
                items={[
                  ...(filters.city
                    ? [{ key: 'city', label: `City: ${filters.city}`, onRemove: () => setFilters({ city: undefined }) }]
                    : []),
                  ...(dateActive
                    ? [{
                        key: 'dates',
                        label: `Last order ${filters.from ?? '…'} → ${filters.to ?? 'today'}`,
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
            entityLabel="readers"
          />
        }
        emptyState={
          <EmptyState
            title="No customers yet."
            description="Every storefront order introduces a reader - they will gather here."
            action={{ label: '+ Add customer', onClick: () => setAdding(true) }}
          />
        }
        entityLabel="customers"
        onClearFilters={clearFilters}
      />

      <AddCustomerModal open={adding} onClose={() => setAdding(false)} />
    </ListPageFrame>
  );
}
