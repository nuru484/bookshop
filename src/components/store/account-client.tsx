// src/components/store/account-client.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { notify } from '@/lib/notify';
import { fmtCedis, fmtDate, fmtTime, initials } from '@/lib/format';
import {
  signin,
  logout,
  verifyTwoFactorLogin,
  resendTwoFactorCode,
  type SigninState,
  type TwoFactorState,
} from '@/lib/auth';
import {
  useSignupMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestTwoFactorSetupMutation,
  useConfirmTwoFactorSetupMutation,
  useDisableTwoFactorMutation,
  useUploadAvatarMutation,
  useRemoveAvatarMutation,
} from '@/redux/user-api';
import { useGetMyOrdersQuery, useMergeWishlistMutation } from '@/redux/catalog-api';
import { extractApiError } from '@/utils/extract-api-error';
import {
  customerProfileSaved,
  customerSignedIn,
  customerSignedOut,
} from '@/redux/shop-slice';
import { userLoggedIn } from '@/redux/auth-slice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { useConfirm } from '@/hooks/use-confirm';
import { StatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { IUser } from '@/types/user.types';
import { cn } from '@/lib/utils';
import { FieldError, FormError, fieldA11y, fieldCls } from './field';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const FIELD_INPUT = 'input-glass px-[15px] py-[13px] text-[15px] font-normal w-full box-border';
const SMALL_INPUT = 'input-glass px-3.5 py-3 text-[14.5px] font-normal w-full box-border';
const LABEL = 'text-[13px] font-bold';

type AcctTab = 'orders' | 'profile' | 'security';

/** Read-only field styled like a filled input (matches the admin profile). */
function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
      <div className={LABEL}>{label}</div>
      <div className="input-glass truncate bg-white/35 px-3.5 py-3 text-[14.5px] font-medium text-ink">
        {value || '-'}
      </div>
    </div>
  );
}

function ShowHide({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-none bg-transparent p-2 text-xs font-bold text-sage hover:text-pine"
    >
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}

export function AccountClient() {
  const hydrated = useHydrated();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { confirm, dialog } = useConfirm();

  const customer = useAppSelector((s) => s.shop.customer);
  const myOrders = useAppSelector((s) => s.shop.myOrders);
  const localWishlist = useAppSelector((s) => s.shop.wishlist);
  const [mergeWishlist] = useMergeWishlistMutation();
  const books = useAppSelector((s) => s.catalog.books);

  /* ── Signed-out state: sign in / sign up / 2FA step ── */
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPw, setShowPw] = useState(false);

  const [siState, siAction, siPending] = useActionState<SigninState, FormData>(signin, {
    success: false,
  });
  const [tfState, tfAction, tfPending] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorLogin,
    { success: false },
  );
  const [tfCode, setTfCode] = useState('');
  const [isResending, startResend] = useTransition();

  const [su, setSu] = useState({ name: '', email: '', pw: '', phone: '' });
  const [suErrs, setSuErrs] = useState<{ name?: string; email?: string; pw?: string; form?: string }>({});
  const [signup, { isLoading: signingUp }] = useSignupMutation();

  // A successful sign-in (either step) lands here.
  const settleSignedIn = (user: IUser) => {
    if (user.role !== 'CUSTOMER') {
      dispatch(userLoggedIn({ user }));
      notify('Signed in. Taking you to the staff console.');
      router.push('/admin');
      return;
    }
    dispatch(
      customerSignedIn({ name: user.fullname, email: user.email, phone: user.phone ?? undefined }),
    );
    // Carry any guest wishlist into the account (fire-and-forget; the
    // authed read path takes over from here).
    if (localWishlist.length) {
      mergeWishlist(localWishlist)
        .unwrap()
        .catch(() => {});
    }
    notify(`Welcome back, ${user.fullname.trim().split(' ')[0]}.`);
  };

  useEffect(() => {
    if (siState.success && siState.user) settleSignedIn(siState.user as IUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per action result
  }, [siState]);

  useEffect(() => {
    if (tfState.success && tfState.user) settleSignedIn(tfState.user as IUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per action result
  }, [tfState]);

  /* ── Signed-in state ── */
  const [tab, setTab] = useState<AcctTab>('orders');

  const { data: meData, isLoading: meLoading } = useGetMeQuery(undefined, {
    skip: !hydrated || !customer,
  });
  const me = meData?.data;

  // Real order history for account holders; local list stays the fallback
  // for guests who checked out without an account session.
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useGetMyOrdersQuery(undefined, { skip: !hydrated || !customer || !me });
  const accountOrders = me ? (ordersData?.data ?? []) : myOrders;

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();
  const [requestSetup, { isLoading: requestingSetup }] = useRequestTwoFactorSetupMutation();
  const [confirmSetup, { isLoading: confirmingSetup }] = useConfirmTwoFactorSetupMutation();
  const [disableTfa, { isLoading: disablingTfa }] = useDisableTwoFactorMutation();
  const [uploadAvatar, { isLoading: uploadingPhoto }] = useUploadAvatarMutation();
  const [removeAvatar, { isLoading: removingPhoto }] = useRemoveAvatarMutation();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [pd, setPd] = useState({ name: '', email: '', phone: '' });
  const [addr, setAddr] = useState({ address: '', city: '' });
  const [pdErrs, setPdErrs] = useState<{ name?: string; email?: string; form?: string }>({});
  const [addrErrs, setAddrErrs] = useState<{ form?: string }>({});

  const [cpw, setCpw] = useState('');
  const [npw, setNpw] = useState('');
  const [showCpw, setShowCpw] = useState(false);
  const [showNpw, setShowNpw] = useState(false);
  const [pwErrs, setPwErrs] = useState<{ current?: string; next?: string; form?: string }>({});

  const [tfaStep, setTfaStep] = useState<'idle' | 'confirming-code' | 'disabling'>('idle');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaPassword, setTfaPassword] = useState('');
  const [showTfaPw, setShowTfaPw] = useState(false);
  const [tfaErr, setTfaErr] = useState('');

  // Photo upload: a picked file is previewed and only sent on Save, so a
  // mis-click never lands on the server.
  const [pendingPhoto, setPendingPhoto] = useState<{
    dataUrl: string;
    name: string;
    size: number;
  } | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);

  // Seed the profile form from the freshest data (adjust-during-render).
  const profileSource = me
    ? `${me.id}:${String(me.updatedAt)}`
    : customer
      ? `local:${customer.email}`
      : null;
  const [seededFrom, setSeededFrom] = useState<string | null>(null);
  if (profileSource && profileSource !== seededFrom) {
    setSeededFrom(profileSource);
    setPd({
      name: me?.fullname ?? customer?.name ?? '',
      email: me?.email ?? customer?.email ?? '',
      phone: me?.phone ?? customer?.phone ?? '',
    });
    setAddr({
      address: me?.address ?? customer?.address ?? '',
      city: me?.city ?? '',
    });
  }

  if (!hydrated) {
    return (
      <section aria-busy="true" className="mx-auto w-full max-w-[640px] pt-10 pb-16">
        <Skeleton className="mb-4 h-10 w-56" />
        <Skeleton className="h-72 w-full" />
      </section>
    );
  }

  /* ─────────────────────────── Signed out ─────────────────────────── */
  if (!customer) {
    const siEmailErr = siState.errors?.email?.[0];
    const siPwErr = siState.errors?.password?.[0];
    const siFormErr = siState.errors?._form?.[0];

    // 2FA challenge step (password was correct, code required).
    if (siState.requiresTwoFactor && !tfState.success) {
      return (
        <section className="animate-fade-up mx-auto w-full max-w-[640px] pt-10 pb-16">
          <div className="glass-from-sm px-1 py-8 sm:px-7">
            <div className="mb-4 flex h-11 w-11 items-center justify-center bg-ink text-base text-cream">
              ✓
            </div>
            <h1 className="m-0 mb-1.5 font-serif text-[28px] font-normal">Check your email</h1>
            <p className="m-0 mb-[22px] text-sm text-sage">
              Enter the 6-digit code we sent to{' '}
              <span className="font-semibold text-moss">{siState.maskedEmail ?? 'your email'}</span>.
            </p>
            <form action={tfAction} className="flex flex-col gap-3.5">
              <input
                name="code"
                value={tfCode}
                onChange={(e) => setTfCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="------"
                required
                autoFocus
                id="tf-code"
                className={cn(
                  fieldCls(
                    'input-glass box-border w-full px-4 py-3 text-center text-lg font-semibold tracking-[0.5em] placeholder:font-normal placeholder:tracking-normal',
                    !!tfState.error,
                  ),
                )}
                {...fieldA11y('tf-code', tfState.error)}
              />
              <FieldError id="tf-code" message={tfState.error} />
              <button type="submit" disabled={tfPending} className="btn-dark px-5 py-3.5 text-[15px]">
                {tfPending ? 'Verifying…' : 'Verify and sign in'}
              </button>
              <button
                type="button"
                disabled={isResending}
                onClick={() =>
                  startResend(async () => {
                    const result = await resendTwoFactorCode();
                    notify(result.resent ? 'A new code has been sent to your email.' : (result.error ?? ''));
                  })
                }
                className="cursor-pointer border-none bg-transparent p-1 text-[13px] font-semibold text-pine hover:text-pine-deep disabled:opacity-50"
              >
                {isResending ? 'Sending…' : "Didn't get a code? Resend"}
              </button>
            </form>
          </div>
        </section>
      );
    }

    const doSignup = async () => {
      const errs: { name?: string; email?: string; pw?: string } = {};
      if (su.name.trim().length < 2) errs.name = 'Tell us your full name.';
      if (!EMAIL_RE.test(su.email.trim())) errs.email = 'Enter a valid email address.';
      if (su.pw.length < 5) {
        errs.pw = 'At least 5 characters, with upper, lower, number and symbol.';
      }
      if (Object.keys(errs).length) {
        setSuErrs(errs);
        return;
      }
      setSuErrs({});
      try {
        const res = await signup({
          fullname: su.name.trim(),
          email: su.email.trim(),
          password: su.pw,
          phone: su.phone.trim() || undefined,
        }).unwrap();
        dispatch(
          customerSignedIn({
            name: res.data.fullname,
            email: res.data.email,
            phone: res.data.phone ?? undefined,
          }),
        );
        if (localWishlist.length) {
          mergeWishlist(localWishlist)
            .unwrap()
            .catch(() => {});
        }
        notify('Welcome to Harmattan Books.');
      } catch (err) {
        const { message } = extractApiError(err);
        // A taken email is a field problem; anything else is form level.
        setSuErrs(/email/i.test(message) ? { email: message } : { form: message });
      }
    };

    return (
      <section className="animate-fade-up mx-auto w-full max-w-[640px] pt-10 pb-16">
        <div className="glass-from-sm px-1 py-8 sm:px-7">
          {mode === 'signin' ? (
            <>
              <h1 className="m-0 mb-1.5 font-serif text-[32px] font-normal">Welcome back</h1>
              <p className="m-0 mb-[22px] text-sm text-sage">
                Sign in to see your orders and speed through checkout.
              </p>
              <form action={siAction} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="si-email" className={LABEL}>
                    Email
                  </label>
                  <input
                    id="si-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@email.com"
                    className={fieldCls(FIELD_INPUT, !!siEmailErr)}
                    {...fieldA11y('si-email', siEmailErr)}
                  />
                  <FieldError id="si-email" message={siEmailErr} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="si-pw" className={LABEL}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="si-pw"
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={4}
                      placeholder="••••••••"
                      className={cn(fieldCls(FIELD_INPUT, !!siPwErr), 'pr-[72px]')}
                      {...fieldA11y('si-pw', siPwErr)}
                    />
                    <ShowHide shown={showPw} onToggle={() => setShowPw((v) => !v)} />
                  </div>
                  <FieldError id="si-pw" message={siPwErr} />
                </div>
                <FormError message={siFormErr} />
                <button type="submit" disabled={siPending} className="btn-dark px-5 py-3.5 text-[15px]">
                  {siPending ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="cursor-pointer border-none bg-transparent p-0 font-semibold text-pine underline hover:text-pine-deep"
                >
                  New here? Create an account
                </button>
                <Link
                  href="/track-order"
                  className="font-semibold text-sage no-underline hover:text-pine hover:no-underline"
                >
                  Track an order →
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="m-0 mb-1.5 font-serif text-[32px] font-normal">Create an account</h1>
              <p className="m-0 mb-[22px] text-sm text-sage">
                Track your orders, keep a wishlist, and speed through checkout.
              </p>
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="su-name" className={LABEL}>
                    Full name
                  </label>
                  <input
                    id="su-name"
                    value={su.name}
                    onChange={(e) => {
                      setSu({ ...su, name: e.target.value });
                      setSuErrs({});
                    }}
                    placeholder="Ama Mensah"
                    className={fieldCls(FIELD_INPUT, !!suErrs.name)}
                    {...fieldA11y('su-name', suErrs.name)}
                  />
                  <FieldError id="su-name" message={suErrs.name} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="su-email" className={LABEL}>
                    Email
                  </label>
                  <input
                    id="su-email"
                    type="email"
                    value={su.email}
                    onChange={(e) => {
                      setSu({ ...su, email: e.target.value });
                      setSuErrs({});
                    }}
                    placeholder="you@email.com"
                    className={fieldCls(FIELD_INPUT, !!suErrs.email)}
                    {...fieldA11y('su-email', suErrs.email)}
                  />
                  <FieldError id="su-email" message={suErrs.email} />
                </div>
                <div className="flex flex-wrap gap-3.5">
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                    <label htmlFor="su-pw" className={LABEL}>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="su-pw"
                        type={showPw ? 'text' : 'password'}
                        value={su.pw}
                        onChange={(e) => {
                          setSu({ ...su, pw: e.target.value });
                          setSuErrs({});
                        }}
                        placeholder="Upper, lower, number, symbol"
                        className={cn(fieldCls(FIELD_INPUT, !!suErrs.pw), 'pr-[72px]')}
                        {...fieldA11y('su-pw', suErrs.pw)}
                      />
                      <ShowHide shown={showPw} onToggle={() => setShowPw((v) => !v)} />
                    </div>
                    <FieldError id="su-pw" message={suErrs.pw} />
                  </div>
                  <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
                    <label htmlFor="su-phone" className={LABEL}>
                      Phone <span className="font-medium text-sage">(optional)</span>
                    </label>
                    <input
                      id="su-phone"
                      value={su.phone}
                      onChange={(e) => setSu({ ...su, phone: e.target.value })}
                      placeholder="024 555 0182"
                      className={FIELD_INPUT}
                    />
                  </div>
                </div>
                <FormError message={suErrs.form} />
                <button
                  type="button"
                  onClick={() => void doSignup()}
                  disabled={signingUp}
                  className="btn-primary px-5 py-3.5 text-[15px]"
                >
                  {signingUp ? 'Creating your account…' : 'Create account'}
                </button>
              </div>
              <div className="mt-4 text-[13px]">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="cursor-pointer border-none bg-transparent p-0 font-semibold text-pine underline hover:text-pine-deep"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </>
          )}
        </div>
        {dialog}
      </section>
    );
  }

  /* ─────────────────────────── Signed in ─────────────────────────── */
  const first = customer.name.trim().split(' ')[0];

  const onSignOut = () =>
    confirm({
      title: 'Sign out?',
      description: 'You can sign back in any time - your basket and wishlist stay on this device.',
      confirmText: 'Sign out',
      onConfirm: async () => {
        await logout();
        dispatch(customerSignedOut());
        notify('Signed out. See you soon.');
      },
    });

  /** Sync the persisted local customer copy after any profile save. */
  const syncLocalCustomer = (over?: Partial<{ name: string; email: string }>) =>
    dispatch(
      customerProfileSaved({
        name: over?.name ?? pd.name.trim(),
        email: over?.email ?? pd.email.trim(),
        phone: pd.phone.trim() || undefined,
        address: addr.address.trim() || undefined,
      }),
    );

  const savePersonal = async () => {
    const errs: { name?: string; email?: string } = {};
    if (pd.name.trim().length < 2) errs.name = 'Tell us your full name.';
    if (!EMAIL_RE.test(pd.email.trim())) errs.email = 'Enter a valid email address.';
    if (Object.keys(errs).length) {
      setPdErrs(errs);
      return;
    }
    setPdErrs({});
    if (me) {
      try {
        const res = await updateProfile({
          userId: me.id,
          body: {
            fullname: pd.name.trim(),
            email: pd.email.trim(),
            phone: pd.phone.trim() || null,
          },
        }).unwrap();
        syncLocalCustomer({ name: res.data.fullname, email: res.data.email });
        setEditingPersonal(false);
        notify('Personal details updated.');
      } catch (err) {
        const { message } = extractApiError(err);
        setPdErrs(/email/i.test(message) ? { email: message } : { form: message });
      }
    } else {
      syncLocalCustomer();
      setEditingPersonal(false);
      notify('Personal details updated.');
    }
  };

  const saveAddress = async () => {
    setAddrErrs({});
    if (me) {
      try {
        await updateProfile({
          userId: me.id,
          body: {
            address: addr.address.trim() || null,
            city: addr.city.trim() || null,
          },
        }).unwrap();
        syncLocalCustomer();
        setEditingAddress(false);
        notify('Delivery address updated.');
      } catch (err) {
        setAddrErrs({ form: extractApiError(err).message });
      }
    } else {
      syncLocalCustomer();
      setEditingAddress(false);
      notify('Delivery address updated.');
    }
  };

  const onUpdatePw = () => {
    if (!me) return;
    const errs: { current?: string; next?: string } = {};
    if (!cpw) errs.current = 'Enter your current password.';
    if (npw.length < 5) {
      errs.next = 'At least 5 characters, with upper, lower, number and symbol.';
    }
    if (Object.keys(errs).length) {
      setPwErrs(errs);
      return;
    }
    setPwErrs({});
    confirm({
      title: 'Update your password?',
      description: 'You will use the new password the next time you sign in.',
      confirmText: 'Update password',
      onConfirm: async () => {
        try {
          await changePassword({ userId: me.id, currentPassword: cpw, newPassword: npw }).unwrap();
          setCpw('');
          setNpw('');
          notify('Password updated.');
        } catch (err) {
          const { message } = extractApiError(err);
          // "Current password is incorrect" belongs on that field.
          setPwErrs(/current password/i.test(message) ? { current: message } : { form: message });
        }
      },
    });
  };

  const doStartEnableTfa = async () => {
    if (!me) return;
    try {
      await requestSetup(me.id).unwrap();
      setTfaStep('confirming-code');
      setTfaCode('');
      notify('A confirmation code has been sent to your email.');
    } catch (err) {
      notify(extractApiError(err).message);
    }
  };

  const onStartEnableTfa = () => {
    if (!me) return;
    setTfaErr('');
    confirm({
      title: 'Enable two-factor authentication?',
      description: `We'll email a 6-digit confirmation code to ${me.email}.`,
      confirmText: 'Send code',
      onConfirm: doStartEnableTfa,
    });
  };

  const onConfirmEnableTfa = async () => {
    if (!me) return;
    if (!/^\d{6}$/.test(tfaCode.trim())) {
      setTfaErr('Enter the 6-digit code from your email.');
      return;
    }
    setTfaErr('');
    try {
      await confirmSetup({ userId: me.id, code: tfaCode.trim() }).unwrap();
      setTfaStep('idle');
      setTfaCode('');
      notify('Two-factor authentication is now enabled.');
    } catch (err) {
      setTfaErr(extractApiError(err).message);
    }
  };

  const onDisableTfa = () => {
    if (!me) return;
    if (!tfaPassword) {
      setTfaErr('Enter your password to disable 2FA.');
      return;
    }
    setTfaErr('');
    confirm({
      title: 'Disable two-factor authentication?',
      description: 'Signing in will only require your password again.',
      confirmText: 'Disable 2FA',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await disableTfa({ userId: me.id, password: tfaPassword }).unwrap();
          setTfaStep('idle');
          setTfaPassword('');
          notify('Two-factor authentication has been disabled.');
        } catch (err) {
          setTfaErr(extractApiError(err).message);
        }
      },
    });
  };

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !me) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file (JPEG, PNG or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setPendingPhoto({ dataUrl, name: file.name, size: file.size });
    };
    reader.onerror = () => notify("Couldn't read that file - try another image.");
    reader.readAsDataURL(file);
  };

  const savePendingPhoto = async () => {
    if (!me || !pendingPhoto) return;
    try {
      const res = await uploadAvatar({ userId: me.id, image: pendingPhoto.dataUrl }).unwrap();
      setPendingPhoto(null);
      notify(res.message);
    } catch (err) {
      notify(extractApiError(err).message);
    }
  };

  const onRemovePhoto = () => {
    if (!me) return;
    confirm({
      title: 'Remove profile photo?',
      description: 'Your initials will show instead. You can upload a new photo any time.',
      confirmText: 'Remove photo',
      onConfirm: async () => {
        try {
          const res = await removeAvatar(me.id).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });
  };

  const avatarSquare = (size: number, textSize: string) =>
    me?.profilePicture ? (
      <button
        type="button"
        onClick={() => setPhotoOpen(true)}
        aria-label="View profile photo"
        className="shrink-0 cursor-pointer border-none bg-transparent p-0"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, next/image has no remote pattern for it */}
        <img
          src={me.profilePicture}
          alt={`${customer.name}'s profile photo`}
          className="h-full w-full object-cover"
        />
      </button>
    ) : (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-pine font-bold text-cream-bright',
          textSize,
        )}
        style={{ width: size, height: size }}
      >
        {initials(customer.name)}
      </div>
    );

  const orderSummaryFor = (items: { id: number; qty: number }[]) =>
    items
      .map((i) => {
        const b = books.find((x) => x.id === i.id);
        return b ? `${b.title}${i.qty > 1 ? ` ×${i.qty}` : ''}` : '';
      })
      .filter(Boolean)
      .join(', ');

  const TABS: { key: AcctTab; label: string }[] = [
    { key: 'orders', label: 'Orders' },
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Security' },
  ];

  const sessionNote = (
    <p className="m-0 text-[13px] text-sage">
      Your session has expired - sign out and sign back in to manage this.
    </p>
  );

  return (
    <section className="animate-fade-up mx-auto w-full max-w-[640px] pt-10 pb-16">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex min-w-0 items-center gap-3.5">
          {avatarSquare(54, 'text-[19px]')}
          <div className="min-w-0">
            <h1 className="m-0 truncate font-serif text-[34px] font-normal">Hello, {first}</h1>
            <div className="truncate text-[13.5px] font-medium text-sage">{customer.email}</div>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="btn-quiet px-[18px] py-2.5 text-[13px]">
          Sign out
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'cursor-pointer border-[1.5px] border-pine px-[18px] py-[9px] text-[13px] font-bold transition-colors',
              tab === key ? 'bg-pine text-cream-bright' : 'bg-transparent text-pine hover:bg-pine/10',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <div className="mb-3.5 text-xs font-bold tracking-[0.2em] text-sage uppercase">Order history</div>
          {me && ordersLoading ? (
            <div aria-busy="true" className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[74px] w-full" />
              ))}
            </div>
          ) : me && ordersError ? (
            <ErrorState
              title="Couldn't load your orders"
              onRetry={() => void refetchOrders()}
            />
          ) : accountOrders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Your first chapter starts in the shop."
              action={{ label: 'Browse books', href: '/shop', variant: 'primary' }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {accountOrders.map((order) => {
                const inner = (
                  <>
                    <div className="min-w-0 flex-[1_1_200px]">
                      <div className="text-[15px] font-bold">
                        {order.id}{' '}
                        <span className="text-[13px] font-normal text-sage">
                          · {fmtDate(order.date)}
                          {fmtTime(order.date) && `, ${fmtTime(order.date)}`}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] text-moss">{orderSummaryFor(order.items)}</div>
                    </div>
                    <StatusPill status={order.status} className="px-3 py-[5px] text-[11.5px] tracking-[0.06em]" />
                    <div className="text-[15px] font-bold">{fmtCedis(order.total)}</div>
                  </>
                );
                // The detail API is session-scoped, so only API accounts link
                // through; guest histories stay as plain rows.
                return me ? (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="glass flex flex-wrap items-center gap-3.5 px-5 py-[18px] text-ink no-underline transition-colors hover:bg-pine/6 hover:no-underline"
                  >
                    {inner}
                    <span className="text-[13px] font-bold text-pine">View →</span>
                  </Link>
                ) : (
                  <div key={order.id} className="glass flex flex-wrap items-center gap-3.5 px-5 py-[18px]">
                    {inner}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'profile' && (
        <div className="flex flex-col gap-3.5">
          {/* Account overview */}
          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3">
            {[
              {
                label: 'Member since',
                value: me ? fmtDate(String(me.createdAt)) : '-',
              },
              { label: 'Orders', value: String(accountOrders.length) },
              {
                label: 'Total spent',
                value: fmtCedis(
                  accountOrders.reduce(
                    (sum, o) => (o.status === 'Cancelled' ? sum : sum + o.total),
                    0,
                  ),
                ),
              },
            ].map((tile) => (
              <div key={tile.label} className="glass min-w-0 px-4 py-3.5">
                <div className="eyebrow mb-1 text-[10px]">{tile.label}</div>
                <div className="truncate font-serif text-[19px] text-ink">{tile.value}</div>
              </div>
            ))}
          </div>

          {/* Profile photo (API accounts only - guests have no upload home) */}
          {me && (
            <div className="glass-from-sm flex flex-wrap items-center gap-4 px-1 py-6 sm:px-7">
              {avatarSquare(64, 'text-[22px]')}
              <div className="min-w-0 flex-[1_1_200px]">
                <div className="mb-1 text-sm font-bold">Profile photo</div>
                <div className="text-[13px] text-sage">JPEG, PNG or WebP, up to 5MB.</div>
              </div>
              {!pendingPhoto && (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="btn-outline-pine px-5 py-2.5 text-[13px]"
                  >
                    {me.profilePicture ? 'Change photo' : 'Upload photo'}
                  </button>
                  {me.profilePicture && (
                    <button
                      type="button"
                      onClick={onRemovePhoto}
                      disabled={removingPhoto}
                      className="btn-quiet px-4 py-2.5 text-[13px] disabled:opacity-60"
                    >
                      {removingPhoto ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                </div>
              )}

              {/* Preview before anything is sent to the server */}
              {pendingPhoto && (
                <div className="flex w-full flex-wrap items-center gap-4 border-t border-mist pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
                  <img
                    src={pendingPhoto.dataUrl}
                    alt="Preview of the photo you picked"
                    className="h-[160px] w-[160px] shrink-0 object-cover"
                  />
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-bold">{pendingPhoto.name}</div>
                      <div className="text-[12.5px] text-sage">
                        {(pendingPhoto.size / 1024 / 1024).toFixed(2)} MB - not saved yet
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => void savePendingPhoto()}
                        disabled={uploadingPhoto}
                        className="btn-primary px-5 py-2.5 text-[13px] shadow-none disabled:opacity-60"
                      >
                        {uploadingPhoto ? 'Saving…' : 'Save photo'}
                      </button>
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="btn-outline-pine px-4 py-2.5 text-[13px]"
                      >
                        Choose another
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingPhoto(null)}
                        disabled={uploadingPhoto}
                        className="btn-quiet px-4 py-2.5 text-[13px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onPickPhoto}
                className="hidden"
              />
            </div>
          )}

          {/* Personal details */}
          <div className="glass-from-sm flex flex-col gap-4 px-1 py-[26px] sm:px-7">
            <div className="text-xs font-bold tracking-[0.2em] text-sage uppercase">
              Personal details
            </div>
            {meLoading ? (
              <div aria-busy="true" className="flex flex-col gap-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : !editingPersonal ? (
              <>
                <div className="flex flex-wrap gap-4">
                  <ViewField label="Full name" value={me?.fullname ?? customer.name} />
                  <ViewField label="Email" value={me?.email ?? customer.email} />
                </div>
                <div className="flex flex-wrap gap-4">
                  <ViewField label="Phone" value={me?.phone ?? customer.phone ?? ''} />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setEditingPersonal(true)}
                    className="btn-outline-pine px-5 py-2.5 text-[13px]"
                  >
                    Edit details
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
                    <label htmlFor="pd-name" className={LABEL}>
                      Full name
                    </label>
                    <input
                      id="pd-name"
                      value={pd.name}
                      onChange={(e) => {
                        setPd({ ...pd, name: e.target.value });
                        setPdErrs({});
                      }}
                      className={fieldCls(SMALL_INPUT, !!pdErrs.name)}
                      {...fieldA11y('pd-name', pdErrs.name)}
                    />
                    <FieldError id="pd-name" message={pdErrs.name} />
                  </div>
                  <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
                    <label htmlFor="pd-email" className={LABEL}>
                      Email
                    </label>
                    <input
                      id="pd-email"
                      type="email"
                      value={pd.email}
                      onChange={(e) => {
                        setPd({ ...pd, email: e.target.value });
                        setPdErrs({});
                      }}
                      className={fieldCls(SMALL_INPUT, !!pdErrs.email)}
                      {...fieldA11y('pd-email', pdErrs.email)}
                    />
                    <FieldError id="pd-email" message={pdErrs.email} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5">
                    <label htmlFor="pd-phone" className={LABEL}>
                      Phone
                    </label>
                    <input
                      id="pd-phone"
                      value={pd.phone}
                      onChange={(e) => setPd({ ...pd, phone: e.target.value })}
                      placeholder="024 555 0182"
                      className={SMALL_INPUT}
                    />
                  </div>
                </div>
                <FormError message={pdErrs.form} />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => void savePersonal()}
                    disabled={savingProfile}
                    className="btn-primary px-6 py-3 text-sm shadow-none"
                  >
                    {savingProfile ? 'Saving…' : 'Save details'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSeededFrom(null);
                      setEditingPersonal(false);
                      setPdErrs({});
                    }}
                    className="btn-quiet px-5 py-3 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Delivery address */}
          <div className="glass-from-sm flex flex-col gap-4 px-1 py-[26px] sm:px-7">
            <div className="text-xs font-bold tracking-[0.2em] text-sage uppercase">
              Delivery address
            </div>
            {meLoading ? (
              <div aria-busy="true" className="flex flex-col gap-3">
                <Skeleton className="h-11 w-full" />
              </div>
            ) : !editingAddress ? (
              <>
                <div className="flex flex-wrap gap-4">
                  <ViewField
                    label="Address"
                    value={me?.address ?? customer.address ?? ''}
                  />
                  <ViewField label="City / town" value={me?.city ?? ''} />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setEditingAddress(true)}
                    className="btn-outline-pine px-5 py-2.5 text-[13px]"
                  >
                    Edit address
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1.5">
                    <label htmlFor="ad-address" className={LABEL}>
                      Address
                    </label>
                    <input
                      id="ad-address"
                      value={addr.address}
                      onChange={(e) => setAddr({ ...addr, address: e.target.value })}
                      placeholder="Aboabo Market Road"
                      className={SMALL_INPUT}
                    />
                  </div>
                  <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
                    <label htmlFor="ad-city" className={LABEL}>
                      City / town
                    </label>
                    <input
                      id="ad-city"
                      value={addr.city}
                      onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                      placeholder="Tamale"
                      className={SMALL_INPUT}
                    />
                  </div>
                </div>
                <FormError message={addrErrs.form} />
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => void saveAddress()}
                    disabled={savingProfile}
                    className="btn-primary px-6 py-3 text-sm shadow-none"
                  >
                    {savingProfile ? 'Saving…' : 'Save address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSeededFrom(null);
                      setEditingAddress(false);
                      setAddrErrs({});
                    }}
                    className="btn-quiet px-5 py-3 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="flex flex-col gap-3.5">
          {/* Change password */}
          <div className="glass-from-sm flex flex-col gap-3.5 px-1 py-6 sm:px-7">
            <div className="text-xs font-bold tracking-[0.2em] text-sage uppercase">Change password</div>
            {!me ? (
              sessionNote
            ) : (
              <>
                <div className="flex flex-wrap gap-4">
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                    <label htmlFor="cpw" className={LABEL}>
                      Current password
                    </label>
                    <div className="relative">
                      <input
                        id="cpw"
                        type={showCpw ? 'text' : 'password'}
                        value={cpw}
                        onChange={(e) => {
                          setCpw(e.target.value);
                          setPwErrs({});
                        }}
                        placeholder="••••••••"
                        className={cn(fieldCls(SMALL_INPUT, !!pwErrs.current), 'pr-[68px]')}
                        {...fieldA11y('cpw', pwErrs.current)}
                      />
                      <ShowHide shown={showCpw} onToggle={() => setShowCpw((v) => !v)} />
                    </div>
                    <FieldError id="cpw" message={pwErrs.current} />
                  </div>
                  <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
                    <label htmlFor="npw" className={LABEL}>
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="npw"
                        type={showNpw ? 'text' : 'password'}
                        value={npw}
                        onChange={(e) => {
                          setNpw(e.target.value);
                          setPwErrs({});
                        }}
                        placeholder="Upper, lower, number, symbol"
                        className={cn(fieldCls(SMALL_INPUT, !!pwErrs.next), 'pr-[68px]')}
                        {...fieldA11y('npw', pwErrs.next)}
                      />
                      <ShowHide shown={showNpw} onToggle={() => setShowNpw((v) => !v)} />
                    </div>
                    <FieldError id="npw" message={pwErrs.next} />
                  </div>
                </div>
                <FormError message={pwErrs.form} />
                <div>
                  <button
                    type="button"
                    onClick={onUpdatePw}
                    disabled={changingPw}
                    className="btn-dark px-[22px] py-3 text-[13.5px]"
                  >
                    {changingPw ? 'Updating…' : 'Update password'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Two-factor authentication */}
          <div className="glass-from-sm px-1 py-6 sm:px-7">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-[1_1_240px]">
                <div className="mb-1 text-sm font-bold">Two-factor authentication</div>
                <div className="text-[13px] text-sage">
                  {!me
                    ? 'Sign back in to manage this.'
                    : me.twoFactorEnabled
                      ? 'Enabled - a 6-digit code is emailed to you at sign-in.'
                      : 'Off - add a second step to protect your account.'}
                </div>
              </div>
              {me &&
                tfaStep === 'idle' &&
                (me.twoFactorEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTfaStep('disabling');
                      setTfaErr('');
                    }}
                    className="cursor-pointer border-[1.5px] border-pine bg-transparent px-5 py-2.5 text-[13px] font-bold text-pine"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onStartEnableTfa}
                    disabled={requestingSetup}
                    className="cursor-pointer border-[1.5px] border-pine bg-pine px-5 py-2.5 text-[13px] font-bold text-cream-bright disabled:opacity-60"
                  >
                    {requestingSetup ? 'Sending code…' : 'Enable 2FA'}
                  </button>
                ))}
            </div>

            {tfaStep === 'confirming-code' && me && (
              <div className="mt-4 border-t border-mist pt-4">
                <div className="mb-2 text-[13px] text-moss">
                  Enter the 6-digit code we just emailed to{' '}
                  <span className="font-semibold">{me.email}</span>.
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    value={tfaCode}
                    onChange={(e) => {
                      setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setTfaErr('');
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="------"
                    autoFocus
                    id="tfa-code"
                    className={fieldCls(
                      'input-glass w-[140px] px-3.5 py-2.5 text-center text-[15px] font-semibold tracking-[0.4em] placeholder:font-normal placeholder:tracking-normal',
                      !!tfaErr,
                    )}
                    {...fieldA11y('tfa-code', tfaErr)}
                  />
                  <button
                    type="button"
                    onClick={() => void onConfirmEnableTfa()}
                    disabled={confirmingSetup}
                    className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
                  >
                    {confirmingSetup ? 'Confirming…' : 'Confirm code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void doStartEnableTfa()}
                    disabled={requestingSetup}
                    className="cursor-pointer border-none bg-transparent p-1 text-[13px] font-semibold text-pine hover:text-pine-deep"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTfaStep('idle');
                      setTfaCode('');
                      setTfaErr('');
                    }}
                    className="btn-quiet px-4 py-2 text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {tfaStep === 'disabling' && me && (
              <div className="mt-4 border-t border-mist pt-4">
                <div className="mb-2 text-[13px] text-moss">
                  Confirm your password to turn two-factor authentication off.
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <input
                      type={showTfaPw ? 'text' : 'password'}
                      value={tfaPassword}
                      onChange={(e) => {
                        setTfaPassword(e.target.value);
                        setTfaErr('');
                      }}
                      placeholder="••••••••"
                      autoFocus
                      id="tfa-pw"
                      className={fieldCls(
                        'input-glass box-border w-[220px] py-2.5 pr-[64px] pl-3.5 text-[14px]',
                        !!tfaErr,
                      )}
                      {...fieldA11y('tfa-pw', tfaErr)}
                    />
                    <ShowHide shown={showTfaPw} onToggle={() => setShowTfaPw((v) => !v)} />
                  </div>
                  <button
                    type="button"
                    onClick={onDisableTfa}
                    disabled={disablingTfa}
                    className="btn-outline-rust px-5 py-2.5 text-[13px]"
                  >
                    {disablingTfa ? 'Disabling…' : 'Disable 2FA'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTfaStep('idle');
                      setTfaPassword('');
                      setTfaErr('');
                    }}
                    className="btn-quiet px-4 py-2 text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {tfaErr && (
              <p
                id={tfaStep === 'disabling' ? 'tfa-pw-error' : 'tfa-code-error'}
                role="alert"
                className="mt-2.5 text-[12.5px] font-medium text-rust"
              >
                {tfaErr}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Full-size profile photo */}
      <Modal
        open={photoOpen && !!me?.profilePicture}
        onClose={() => setPhotoOpen(false)}
        className="sm:max-w-[460px]"
        labelledBy="photo-view-title"
      >
        <h2 id="photo-view-title" className="mb-3.5 font-serif text-[22px] font-normal">
          Profile photo
        </h2>
        {me?.profilePicture && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, next/image has no remote pattern for it
          <img
            src={me.profilePicture}
            alt={`${customer.name}'s profile photo, full size`}
            className="mx-auto block max-h-[420px] w-full max-w-[420px] object-contain"
          />
        )}
      </Modal>

      {dialog}
    </section>
  );
}
