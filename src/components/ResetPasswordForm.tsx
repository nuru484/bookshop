// src/components/ResetPasswordForm.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { resetPassword, type ResetPasswordState } from '../lib/auth';
import { notify } from '@/lib/notify';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.redirectTo) {
      notify(state.message ?? 'Password reset successfully');
      router.push(state.redirectTo);
    } else if (state.errors) {
      const firstError =
        state.errors._form?.[0] ??
        state.errors.token?.[0] ??
        state.errors.password?.[0];
      if (firstError) notify(firstError);
    }
  }, [state, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (password !== confirmPassword) {
      e.preventDefault();
      setConfirmError('Passwords do not match');
      return;
    }
    setConfirmError(null);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 animate-fade-up">
      <div className="glass-from-sm">
        {/* Header */}
        <div className="border-b border-mist px-1 pt-6 pb-6 sm:px-8 sm:pt-8 text-center">
          <Image
            src="/logo-mark.png"
            alt=""
            width={64}
            height={64}
            priority
            className="mx-auto mb-3 h-16 w-16 object-contain"
          />
          <div className="font-serif text-[26px] leading-none text-ink">Harmattan Books</div>
          <div className="mt-1.5 text-[9.5px] font-bold tracking-[0.28em] text-gold-deep uppercase">
            Staff console
          </div>
          <h1 className="mt-4 font-serif text-[28px] leading-tight font-normal text-ink">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-sage">Choose a new password for your account</p>
        </div>

        {!token ? (
          <div className="space-y-5 px-1 py-8 sm:px-8 text-center">
            <p className="text-sm text-rust">
              This reset link is invalid or incomplete. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-pine no-underline hover:text-pine-deep hover:no-underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form action={action} onSubmit={handleSubmit}>
            <div className="space-y-5 px-1 py-6 sm:px-8">
              <input type="hidden" name="token" value={token} />

              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-ink" htmlFor="password">
                  New password
                </label>
                <div className="relative">
                  <input
                    className="input-glass box-border w-full py-[13px] pr-[72px] pl-[15px] text-[15px]"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="At least 8 characters"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer p-2 text-xs font-bold tracking-[0.06em] text-sage hover:text-pine"
                    tabIndex={-1}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {state.errors?.password && (
                  <p className="text-[12.5px] font-medium text-pine">{state.errors.password[0]}</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-ink" htmlFor="confirmPassword">
                  Confirm new password
                </label>
                <input
                  className="input-glass px-[15px] py-[13px] text-[15px]"
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {confirmError && (
                  <p className="text-[12.5px] font-medium text-rust">{confirmError}</p>
                )}
              </div>

              {state.errors?._form && (
                <div className="border border-rust/25 bg-rust-pale/60 p-3">
                  <ul className="list-disc space-y-0.5 pl-4">
                    {state.errors._form.map((error) => (
                      <li key={error} className="text-xs font-medium text-rust">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full px-5 py-3.5 text-[15px]"
                disabled={pending}
              >
                {pending ? 'Resetting…' : 'Reset password'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-pine no-underline hover:text-pine-deep hover:no-underline"
                >
                  ← Back to sign in
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
