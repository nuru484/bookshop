// src/components/admin/profile-client.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/redux/store';
import { userLoggedIn } from '@/redux/auth-slice';
import {
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
} from '@/redux/user-api';
import { updateUserSchema } from '@/validations/user-validation';
import { extractApiError } from '@/utils/extract-api-error';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { AvatarManager } from './avatar-manager';
import { FormError, FormField, useFieldErrors } from './form-field';
import { SecuritySettings } from './security-settings';

const labelCls = 'text-[13px] font-bold';

/**
 * Read-only field styled like a filled input, so view mode reads as legibly
 * as edit mode.
 */
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

function ProfileSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass-from-sm px-1 py-5 sm:px-7 sm:py-6">
          <Skeleton className="mb-4 h-3 w-40" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-11 flex-[1_1_200px]" />
            <Skeleton className="h-11 flex-[1_1_200px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfileClient() {
  const dispatch = useAppDispatch();
  const { confirm, dialog } = useConfirm();

  const { data, isLoading, isError, refetch } = useGetMeQuery();
  const me = data?.data;

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [uploadAvatar, { isLoading: uploadingAvatar }] = useUploadAvatarMutation();
  const [removeAvatar, { isLoading: removingAvatar }] = useRemoveAvatarMutation();

  const [editingProfile, setEditingProfile] = useState(false);
  const [prof, setProf] = useState({ fullname: '', email: '', phone: '' });
  const {
    errors: profErrors,
    setErrors: setProfErrors,
    formError: profFormError,
    setFormError: setProfFormError,
    clearField: clearProfField,
    applyServerError: applyProfServerError,
  } = useFieldErrors<'fullname' | 'email' | 'phone'>();

  // Seed the form whenever a fresh profile arrives (adjust-during-render
  // pattern instead of a setState-in-effect).
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  const meVersion = me ? `${me.id}:${String(me.updatedAt)}` : null;
  if (me && meVersion !== seededFrom) {
    setSeededFrom(meVersion);
    setProf({ fullname: me.fullname, email: me.email, phone: me.phone ?? '' });
  }

  // Keep the persisted auth user (sidebar name, localStorage) in sync with
  // what the server returned.
  useEffect(() => {
    if (me) dispatch(userLoggedIn({ user: me }));
  }, [me, dispatch]);

  if (isLoading) {
    return (
      <div className="max-w-[720px] animate-fade-up">
        <h1 className="m-0 mb-5 font-serif text-[32px] font-normal">My profile</h1>
        <ProfileSkeleton />
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="max-w-[720px] animate-fade-up">
        <h1 className="m-0 mb-5 font-serif text-[32px] font-normal">My profile</h1>
        <ErrorState title="Couldn't load your profile" onRetry={() => void refetch()} />
      </div>
    );
  }

  /** Called once the admin has seen the preview and confirmed it. */
  const saveAvatar = async (dataUrl: string) => {
    try {
      const res = await uploadAvatar({ userId: me.id, image: dataUrl }).unwrap();
      dispatch(userLoggedIn({ user: res.data }));
      notify(res.message);
    } catch (err) {
      notify(extractApiError(err).message);
    }
  };

  const onRemoveAvatar = () =>
    confirm({
      title: 'Remove your profile picture?',
      description: 'Your initials will show in its place across the console.',
      confirmText: 'Remove photo',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await removeAvatar(me.id).unwrap();
          dispatch(userLoggedIn({ user: res.data }));
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  const doSaveProfile = async () => {
    try {
      const res = await updateProfile({
        userId: me.id,
        body: {
          fullname: prof.fullname.trim(),
          email: prof.email.trim(),
          phone: prof.phone.trim() || null,
        },
      }).unwrap();
      dispatch(userLoggedIn({ user: res.data }));
      setEditingProfile(false);
      notify('Profile updated.');
    } catch (err) {
      // A duplicate email comes back as a 409 naming the email field.
      const message = applyProfServerError(err);
      if (/email/i.test(message)) {
        setProfErrors({ email: message });
        setProfFormError('');
      }
      notify(message);
    }
  };

  const saveProfile = () => {
    const parsed = updateUserSchema.safeParse({
      fullname: prof.fullname.trim(),
      email: prof.email.trim(),
      phone: prof.phone.trim() || null,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = issue?.path[0];
      if (key === 'fullname' || key === 'email' || key === 'phone') {
        setProfErrors({ [key]: issue.message });
        setProfFormError('');
      } else {
        setProfFormError(issue?.message ?? 'Check the profile fields.');
      }
      return;
    }
    setProfErrors({});
    setProfFormError('');
    confirm({
      title: 'Save profile changes?',
      description: 'Your name, email and phone will be updated across the console.',
      confirmText: 'Save changes',
      onConfirm: doSaveProfile,
    });
  };

  const cancelEditProfile = () => {
    setProf({ fullname: me.fullname, email: me.email, phone: me.phone ?? '' });
    setProfErrors({});
    setProfFormError('');
    setEditingProfile(false);
  };

  return (
    <div className="max-w-[720px] animate-fade-up">
      <h1 className="m-0 mb-5 font-serif text-[32px] font-normal">My profile</h1>

      {/* Profile details */}
      <div className="glass-from-sm mb-4 px-1 py-5 sm:px-7 sm:py-6">
        <div className="mb-[18px]">
          <AvatarManager
            src={me.profilePicture}
            name={me.fullname}
            uploading={uploadingAvatar}
            removing={removingAvatar}
            onUpload={saveAvatar}
            onRemove={onRemoveAvatar}
          >
            <div className="truncate font-serif text-[22px]">{me.fullname}</div>
            <div className="text-[11px] font-bold tracking-[0.16em] text-gold uppercase">
              {me.role === 'ADMIN' ? 'Admin · Full access' : 'Editor'}
            </div>
          </AvatarManager>
        </div>

        {!editingProfile ? (
          <>
            <div className="mb-4 flex flex-wrap gap-4">
              <ViewField label="Email" value={me.email} />
              <ViewField label="Phone" value={me.phone ?? ''} />
            </div>
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              className="btn-outline-pine px-5 py-2.5 text-[13px]"
            >
              Edit profile
            </button>
          </>
        ) : (
          <>
            <div className="mb-3.5 flex flex-wrap gap-4">
              <FormField label="Full name" error={profErrors.fullname} className="flex-[1_1_200px]">
                {(props) => (
                  <input
                    {...props}
                    value={prof.fullname}
                    onChange={(e) => {
                      setProf({ ...prof, fullname: e.target.value });
                      clearProfField('fullname');
                    }}
                  />
                )}
              </FormField>
              <FormField label="Email" error={profErrors.email} className="flex-[1_1_200px]">
                {(props) => (
                  <input
                    {...props}
                    type="email"
                    value={prof.email}
                    onChange={(e) => {
                      setProf({ ...prof, email: e.target.value });
                      clearProfField('email');
                    }}
                  />
                )}
              </FormField>
              <FormField label="Phone" error={profErrors.phone} className="flex-[1_1_160px]">
                {(props) => (
                  <input
                    {...props}
                    value={prof.phone}
                    onChange={(e) => {
                      setProf({ ...prof, phone: e.target.value });
                      clearProfField('phone');
                    }}
                  />
                )}
              </FormField>
            </div>
            <FormError message={profFormError} />
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={saveProfile}
                disabled={savingProfile}
                className="btn-primary px-6 py-3 text-[13.5px] shadow-none"
              >
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
              <button type="button" onClick={cancelEditProfile} className="btn-quiet px-5 py-3 text-[13.5px]">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      <SecuritySettings me={me} />
      {dialog}
    </div>
  );
}
