// src/components/admin/staff-detail-client.tsx
'use client';

import Link from 'next/link';
import { useGetUserQuery, useGetMeQuery, useUpdateUserRoleMutation } from '@/redux/user-api';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { initials, fmtDate } from '@/lib/format';
import { extractApiError } from '@/utils/extract-api-error';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import type { UserRole } from '@/types/user.types';
import { staffAvatarColor, staffRolePill } from './staff-client';
import { AvatarView } from './avatar-manager';
import { SecuritySettings } from './security-settings';
import { isNotFound, refetchDim } from './api-helpers';

const labelCls = 'text-[13px] font-bold';

/** Read-only field styled like a filled input (matches the profile page). */
function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
      <div className={labelCls}>{label}</div>
      <div className="input-glass truncate bg-white/35 px-3.5 py-3 text-[14.5px] font-medium text-ink">
        {value || '-'}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true">
      <Skeleton className="mb-4 h-4 w-24" />
      <div className="mb-5 flex items-center gap-4">
        <Skeleton className="h-[54px] w-[54px]" />
        <Skeleton className="h-9 w-56" />
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="glass-from-sm mb-4 px-1 py-5 sm:px-7 sm:py-6">
          <Skeleton className="mb-4 h-3 w-32" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-11 flex-[1_1_200px]" />
            <Skeleton className="h-11 flex-[1_1_200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StaffDetailClient({ userId }: { userId: string }) {
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, isFetching, isError, error, refetch } = useGetUserQuery(userId);
  const { data: meData } = useGetMeQuery();
  const [updateRole] = useUpdateUserRoleMutation();

  if (isLoading) {
    return (
      <div className="max-w-[720px] animate-fade-up">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          title="We can't find that team member."
          description="They may have been removed, or the link is wrong."
          action={{ label: '← All staff', href: '/admin/staff', variant: 'dark' }}
          className="mx-auto mt-10 max-w-[560px]"
        />
      );
    }
    return (
      <div className="mx-auto mt-10 max-w-[560px]">
        <ErrorState title="Couldn't load this team member" onRetry={() => void refetch()} />
      </div>
    );
  }

  const member = data.data;
  const me = meData?.data;
  const isSelf = me?.id === member.id;
  const firstName = member.fullname.trim().split(' ')[0];

  const onChangeRole = () => {
    const nextRole: UserRole = member.role === 'ADMIN' ? 'EDITOR' : 'ADMIN';
    confirm({
      title: `Change ${member.fullname}'s role to ${nextRole === 'ADMIN' ? 'Admin' : 'Editor'}?`,
      description:
        nextRole === 'ADMIN'
          ? 'Admins can manage staff, customers and every part of the console.'
          : 'Editors can manage the catalogue and orders, but not staff or customers.',
      confirmText: `Make ${nextRole === 'ADMIN' ? 'Admin' : 'Editor'}`,
      onConfirm: async () => {
        try {
          const res = await updateRole({ userId: member.id, role: nextRole }).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });
  };

  return (
    <div className={cn('max-w-[720px] animate-fade-up', refetchDim(isFetching, isLoading))}>
      <Link
        href="/admin/staff"
        className="mb-4 inline-block text-[13px] font-bold text-sage hover:text-pine hover:no-underline"
      >
        ← All staff
      </Link>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        {member.profilePicture ? (
          <AvatarView src={member.profilePicture} name={member.fullname} size={54} />
        ) : (
          <div
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center text-[19px] font-bold text-cream-bright"
            style={{ background: staffAvatarColor(member.email) }}
          >
            {initials(member.fullname)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-serif text-[32px] font-normal">
            {member.fullname}
            {isSelf && (
              <span className="ml-2 align-middle text-xs font-bold tracking-[0.08em] text-pine">· You</span>
            )}
          </h1>
        </div>
        {staffRolePill(member.role)}
      </div>

      {/* Profile details */}
      <div className="glass-from-sm mb-4 px-1 py-5 sm:px-7 sm:py-6">
        <div className="mb-3.5 text-xs font-bold tracking-[0.2em] text-sage uppercase">Profile</div>
        <div className="mb-4 flex flex-wrap gap-4">
          <ViewField label="Email" value={member.email} />
          <ViewField label="Phone" value={member.phone ?? ''} />
        </div>
        <div className="flex flex-wrap gap-4">
          <ViewField label="Role" value={member.role === 'ADMIN' ? 'Admin' : 'Editor'} />
          <ViewField label="Joined" value={fmtDate(String(member.createdAt))} />
          <ViewField label="Two-factor" value={member.twoFactorEnabled ? 'Enabled' : 'Off'} />
        </div>
        {!isSelf && (
          <button
            type="button"
            onClick={onChangeRole}
            className="mt-4 cursor-pointer border border-ink/30 bg-transparent px-4 py-2.5 text-[13px] font-bold text-moss hover:border-pine hover:text-pine"
          >
            {member.role === 'ADMIN' ? 'Make Editor' : 'Make Admin'}
          </button>
        )}
        {isSelf && (
          <div className="mt-4 text-[12.5px] text-sage">
            This is your own account - manage it from{' '}
            <Link href="/admin/profile" className="font-semibold text-pine">
              My profile
            </Link>
            .
          </div>
        )}
      </div>

      {/* Security: your own record gets the real controls, even when reached
          through the staff table. Everyone else's stays read-only. */}
      {isSelf ? (
        <SecuritySettings me={member} />
      ) : (
        <>
          <div className="glass-from-sm mb-4 px-1 py-5 opacity-55 sm:px-7 sm:py-6" aria-disabled="true">
            <div className="mb-3.5 text-xs font-bold tracking-[0.2em] text-sage uppercase">Password</div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 flex-[1_1_240px]">
                <div className="text-[15px] font-semibold tracking-[0.2em] text-ink">••••••••</div>
                <div className="mt-1 text-[12.5px] text-sage">
                  Only {firstName} can manage their own security settings.
                </div>
              </div>
              <button type="button" disabled className="btn-outline-pine cursor-not-allowed px-5 py-2.5 text-[13px]">
                Change password
              </button>
            </div>
          </div>

          <div className="glass-from-sm px-1 py-5 opacity-55 sm:px-7 sm:py-6" aria-disabled="true">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-[1_1_240px]">
                <div className="mb-1 text-sm font-bold">Two-factor authentication</div>
                <div className="text-[13px] text-sage">
                  {member.twoFactorEnabled ? 'Enabled.' : 'Off.'} Only {firstName} can manage their own
                  security settings.
                </div>
              </div>
              <button
                type="button"
                disabled
                className="cursor-not-allowed border-[1.5px] border-pine bg-transparent px-5 py-2.5 text-[13px] font-bold text-pine"
              >
                {member.twoFactorEnabled ? 'Disable' : 'Enable 2FA'}
              </button>
            </div>
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
