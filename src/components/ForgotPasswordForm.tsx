// src/components/ForgotPasswordForm.tsx
'use client';

import { useActionState, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { forgotPassword, type ForgotPasswordState } from '../lib/auth';
import { notify } from '@/lib/notify';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');

  const [state, action, pending] = useActionState<ForgotPasswordState, FormData>(
    forgotPassword,
    { success: false },
  );

  useEffect(() => {
    if (state.error) notify(state.error);
  }, [state]);

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
            Forgot your password?
          </h1>
          <p className="mt-1 text-sm text-sage">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {state.success ? (
          <div className="space-y-5 px-1 py-8 sm:px-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center bg-pine text-lg text-cream">
              <Check className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm text-moss">{state.message}</p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-pine no-underline hover:text-pine-deep hover:no-underline"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form action={action}>
            <div className="space-y-5 px-1 py-6 sm:px-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-ink" htmlFor="email">
                  Email
                </label>
                <input
                  className="input-glass px-[15px] py-[13px] text-[15px]"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@harmattanbooks.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full px-5 py-3.5 text-[15px]"
                disabled={pending}
              >
                {pending ? 'Sending…' : 'Send reset link'}
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
