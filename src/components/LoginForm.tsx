// src/components/LoginForm.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import Image from 'next/image';
import { siteConfig } from '@/lib/site';
import Link from 'next/link';
import { userLoggedIn } from '@/redux/auth-slice';
import { signin, type SigninState } from '../lib/auth';
import type { IUser } from '@/types/user.types';
import { notify } from '@/lib/notify';
import TwoFactorLoginStep from './TwoFactorLoginStep';

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin';

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');

  const [state, action, pending] = useActionState<SigninState, FormData>(
    signin,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.redirectTo && state.user) {
      dispatch(userLoggedIn({ user: state.user as IUser }));
      notify('Signed in. Welcome back.');
      router.push(state.redirectTo);
    } else if (!state.success && state.errors) {
      const firstError =
        state.errors._form?.[0] ??
        state.errors.email?.[0] ??
        state.errors.password?.[0];
      if (firstError) notify(firstError);
    }
  }, [state, router, dispatch]);

  // Password verified, 2FA enabled: swap the credentials form for the code step.
  if (state.requiresTwoFactor) {
    return <TwoFactorLoginStep maskedEmail={state.maskedEmail} />;
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 animate-fade-up">
      <form action={action}>
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
            <div className="font-serif text-[26px] leading-none text-ink">{siteConfig.name}</div>
            <div className="mt-1.5 text-[9.5px] font-bold tracking-[0.28em] text-gold-deep uppercase">
              Staff console
            </div>
            <p className="mt-3 text-sm text-sage">Sign in to manage the shop.</p>
          </div>

          {/* Form body */}
          <div className="space-y-5 px-1 py-6 sm:px-8">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-ink" htmlFor="email">
                Email
              </label>
              <input
                className="input-glass px-[15px] py-[13px] text-[15px]"
                id="email"
                type="email"
                name="email"
                placeholder={`you@${siteConfig.domain}`}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {state?.errors?.email && (
                <p className="text-[12.5px] font-medium text-pine">{state.errors.email[0]}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-ink" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  className="input-glass box-border w-full py-[13px] pr-[72px] pl-[15px] text-[15px]"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer p-2 text-xs font-bold tracking-[0.06em] text-sage hover:text-pine"
                  tabIndex={-1}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {state?.errors?.password && (
                <ul className="list-disc pl-4">
                  {state.errors.password.map((error) => (
                    <li key={error} className="text-[12.5px] font-medium text-pine">
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[13px] font-semibold text-pine underline hover:text-pine-deep"
              >
                Forgot password?
              </Link>
            </div>

            <input type="hidden" name="redirectTo" value={callbackUrl} />

            {/* Form-level errors */}
            {state?.errors?._form && (
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

            {/* Submit */}
            <button
              type="submit"
              className="btn-dark w-full px-5 py-3.5 text-[15px]"
              disabled={pending}
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs text-sage">
              <Link
                href="/"
                className="font-semibold text-pine no-underline hover:text-pine-deep hover:no-underline"
              >
                ← Back to the storefront
              </Link>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
