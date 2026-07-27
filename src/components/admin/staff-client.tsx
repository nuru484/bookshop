// src/components/admin/staff-client.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import {
  useGetUsersQuery,
  useGetMeQuery,
  useCreateStaffMutation,
  useUpdateUserRoleMutation,
} from '@/redux/user-api';
import { useConfirm } from '@/hooks/use-confirm';
import { useTableUrlState } from '@/hooks/use-table-url-state';
import { notify } from '@/lib/notify';
import { extractApiError } from '@/utils/extract-api-error';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { IUser, UserRole } from '@/types/user.types';
import { PageHeader } from './page-header';
import { FormError, FormField, useFieldErrors } from './form-field';
import {
  DataTable,
  RowCard,
  RowCardBody,
  useServerTable,
  type ColumnDef,
  type SortState,
} from './table/data-table';
import { RowActionsMenu } from './table/row-actions-menu';
import { DateTimeCell } from './table/date-time-cell';
import { TableToolbar, toolbarSelectCls } from './table/table-toolbar';
import { ActiveFilterChips } from './table/active-filters';
import { TablePagination } from './table/table-pagination';
import { ListPageFrame } from './table/list-page';
import { AvatarCell, TitleWithSubtitle } from './table/cells';

const STAFF_AVATARS = ['#2E6B4F', '#5A4632', '#34506B', '#8A4A5C'];

/** Stable avatar color independent of filtering/paging. */
export const staffAvatarColor = (email: string): string => {
  let hash = 0;
  for (const ch of email) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return STAFF_AVATARS[hash % STAFF_AVATARS.length];
};

export const staffRolePill = (role: UserRole) => (
  <span
    className="px-3 py-[5px] text-[11px] font-bold tracking-[0.06em] whitespace-nowrap"
    style={{
      background: role === 'ADMIN' ? '#1C2A21' : '#E4EBDF',
      color: role === 'ADMIN' ? '#C2A65A' : '#3E5A41',
    }}
  >
    {role === 'ADMIN' ? 'Admin' : 'Editor'}
  </span>
);

const tfaPill = (enabled: boolean | undefined) => (
  <span
    className="px-2.5 py-[5px] text-[11px] font-bold tracking-[0.06em] whitespace-nowrap"
    style={{
      background: enabled ? '#E4EBDF' : '#F0DEDA',
      color: enabled ? '#3E5A41' : '#93381A',
    }}
  >
    {enabled ? '2FA on' : '2FA off'}
  </span>
);

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const passwordProblem = (pw: string): string | null => {
  if (pw.length < 5) return 'Password must be at least 5 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password needs an uppercase letter.';
  if (!/[a-z]/.test(pw)) return 'Password needs a lowercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password needs a number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password needs a symbol.';
  return null;
};

/** Modal form creating a real, login-capable staff account. */
function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const [createStaff, { isLoading: creating }] = useCreateStaffMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const { errors, setErrors, formError, setFormError, clearField, reset, applyServerError } =
    useFieldErrors<'name' | 'email' | 'password' | 'phone'>();

  // Reset the form each time the modal opens (adjust-during-render pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName('');
      setEmail('');
      setPassword('');
      setShowPw(false);
      setPhone('');
      setRole('ADMIN');
      reset();
    }
  }

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const next: Partial<Record<'name' | 'email' | 'password', string>> = {};
    if (trimmedName.length < 2) next.name = 'Enter their full name.';
    if (!EMAIL_RE.test(trimmedEmail)) next.email = 'Enter a valid email address.';
    const pwErr = passwordProblem(password);
    if (pwErr) next.password = pwErr;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }
    try {
      const res = await createStaff({
        fullname: trimmedName,
        email: trimmedEmail,
        password,
        phone: phone.trim() || undefined,
        role,
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
      <h2 id={titleId} className="m-0 mb-1 font-serif text-2xl font-normal text-ink">
        Add an admin
      </h2>
      <p className="m-0 mb-4 text-[13px] text-sage">
        Creates a real console account - they can sign in at /login right away.
      </p>
      <div className="flex flex-col gap-3.5">
        <FormField label="Full name" error={errors.name}>
          {(props) => (
            <input
              {...props}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearField('name');
              }}
              placeholder="Adjoa Mills"
            />
          )}
        </FormField>
        <FormField label="Email" error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearField('email');
              }}
              placeholder="teammate@harmattanbooks.com"
            />
          )}
        </FormField>
        <FormField
          label="Password"
          error={errors.password}
          hint="Min 5 characters with upper, lower, number and symbol."
        >
          {(props) => (
            <div className="relative">
              <input
                {...props}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearField('password');
                }}
                placeholder="••••••••"
                className={`${props.className} w-full pr-[64px]`}
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
        <div className="flex gap-3.5">
          <FormField label="Phone (optional)" error={errors.phone} className="min-w-0 flex-1">
            {(props) => (
              <input
                {...props}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearField('phone');
                }}
                placeholder="024 555 0100"
              />
            )}
          </FormField>
          <FormField label="Role" className="w-[130px] shrink-0">
            {(props) => (
              <select
                {...props}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={`${props.className} cursor-pointer font-semibold`}
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
              </select>
            )}
          </FormField>
        </div>
        <FormError message={formError} />
        <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-quiet px-5 py-2.5 text-[13px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={creating}
            className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
          >
            {creating ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const DEFAULT_SORT: SortState = { key: 'name', dir: 1 };

export default function StaffClient() {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const urlState = useTableUrlState({ filterKeys: ['role'] });
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [addOpen, setAddOpen] = useState(false);

  const { filters, setFilters, clearFilters, search, setSearch } = urlState;

  const { data, isLoading, isFetching, isError, refetch } = useGetUsersQuery({
    role: filters.role || 'STAFF',
    search: search || undefined,
    page: urlState.page,
    limit: urlState.pageSize,
  });
  const { data: meData } = useGetMeQuery();
  const me = meData?.data;

  const [updateRole] = useUpdateUserRoleMutation();

  const users = data?.data ?? [];
  const table = useServerTable<IUser>({
    rows: users,
    meta: data?.meta,
    urlState,
    defaultSort: DEFAULT_SORT,
    sortState: sort,
    onSortChange: setSort,
  });

  const filterCount = filters.role ? 1 : 0;

  const openMember = (u: IUser) => router.push(`/admin/staff/${u.id}`);

  const onChangeRole = (u: IUser) => {
    const nextRole: UserRole = u.role === 'ADMIN' ? 'EDITOR' : 'ADMIN';
    confirm({
      title: `Change ${u.fullname}'s role to ${nextRole === 'ADMIN' ? 'Admin' : 'Editor'}?`,
      description:
        nextRole === 'ADMIN'
          ? 'Admins can manage staff, customers and every part of the console.'
          : 'Editors can manage the catalogue and orders, but not staff or customers.',
      confirmText: `Make ${nextRole === 'ADMIN' ? 'Admin' : 'Editor'}`,
      onConfirm: async () => {
        try {
          const res = await updateRole({ userId: u.id, role: nextRole }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });
  };

  const avatar = (u: IUser, size = 38) => (
    <AvatarCell
      name={u.fullname}
      image={u.profilePicture}
      color={staffAvatarColor(u.email)}
      size={size}
      textClass="text-sm"
    />
  );

  const roleButton = (u: IUser) =>
    me && u.id === me.id ? null : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeRole(u);
        }}
        className="cursor-pointer border border-ink/30 bg-transparent px-3.5 py-[7px] text-xs font-bold whitespace-nowrap text-moss hover:border-pine hover:text-pine"
      >
        {u.role === 'ADMIN' ? 'Make Editor' : 'Make Admin'}
      </button>
    );

  const columns: ColumnDef<IUser>[] = [
    {
      key: 'name',
      header: 'Member',
      width: 'flex-[1_1_220px] min-w-0',
      cell: (u) => (
        <span className="flex min-w-0 items-center gap-3">
          {avatar(u)}
          <TitleWithSubtitle
            title={u.fullname}
            titleExtra={
              me && u.id === me.id ? (
                <span className="text-[10px] font-bold tracking-[0.08em] whitespace-nowrap text-pine">· You</span>
              ) : undefined
            }
            subtitle={u.email}
          />
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: 'flex-[0_0_96px]',
      cell: (u) => staffRolePill(u.role),
    },
    {
      key: 'tfa',
      header: '2FA',
      width: 'flex-[0_0_86px]',
      hideBelow: 'lg',
      cell: (u) => tfaPill(u.twoFactorEnabled),
    },
    {
      key: 'joined',
      header: 'Joined',
      width: 'flex-[0_0_126px]',
      hideBelow: 'lg',
      cell: (u) => <DateTimeCell iso={String(u.createdAt)} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'flex-[0_0_120px]',
      cell: (u) => <span className="flex justify-end">{roleButton(u)}</span>,
    },
  ];

  const header = (
    <PageHeader title="Staff" subtitle="Who can open this console, and what they can touch." />
  );

  return (
    <ListPageFrame
      header={header}
      isLoading={isLoading}
      isFetching={isFetching}
      isError={isError}
      onRetry={() => void refetch()}
      errorTitle="Couldn't load the team"
      skeletonRows={urlState.pageSize}
    >
      <DataTable<IUser>
        columns={columns}
        table={table}
        rowKey={(u) => u.id}
        onRowOpen={openMember}
        renderRowCard={(u) => (
          <RowCard
            onOpen={() => openMember(u)}
            action={
              me && u.id === me.id ? undefined : (
                <RowActionsMenu
                  label={u.fullname}
                  actions={[
                    {
                      label: u.role === 'ADMIN' ? 'Make Editor' : 'Make Admin',
                      onSelect: () => onChangeRole(u),
                    },
                  ]}
                />
              )
            }
          >
            <RowCardBody
              visual={avatar(u, 34)}
              title={
                <>
                  {u.fullname}{' '}
                  {me && u.id === me.id && (
                    <span className="text-[10px] font-bold tracking-[0.08em] text-pine">· You</span>
                  )}
                </>
              }
              meta={u.email}
              badge={staffRolePill(u.role)}
            />
          </RowCard>
        )}
        toolbar={
          <TableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or email…"
            hasFiltersApplied={urlState.filtersActive}
            filterCount={filterCount}
            onClearAll={clearFilters}
            actions={
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="btn-primary h-11 px-4 text-[13px] whitespace-nowrap shadow-none"
              >
                + Add admin
              </button>
            }
            filterFields={
              <select
                value={filters.role ?? ''}
                onChange={(e) => setFilters({ role: e.target.value || undefined })}
                className={toolbarSelectCls}
              >
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
              </select>
            }
            chips={
              <ActiveFilterChips
                items={
                  filters.role
                    ? [{
                        key: 'role',
                        label: `Role: ${filters.role === 'ADMIN' ? 'Admin' : 'Editor'}`,
                        onRemove: () => setFilters({ role: undefined }),
                      }]
                    : []
                }
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
            entityLabel="members"
          />
        }
        emptyState={
          <EmptyState
            title="No staff yet."
            description="Console accounts (admins and editors) will appear here."
            action={{ label: '+ Add admin', onClick: () => setAddOpen(true) }}
          />
        }
        entityLabel="staff members"
        onClearFilters={clearFilters}
        minWidth={680}
      />
      <AddStaffModal open={addOpen} onClose={() => setAddOpen(false)} />
      {dialog}
    </ListPageFrame>
  );
}
