// src/components/TwoFactorLoginStep.tsx
'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { userLoggedIn } from '@/redux/auth-slice';
import {
  verifyTwoFactorLogin,
  resendTwoFactorCode,
  type TwoFactorState,
} from '../lib/auth';
import type { IUser } from '@/types/user.types';
import { notify } from '@/lib/notify';

interface TwoFactorLoginStepProps {
  maskedEmail?: string;
}

export default function TwoFactorLoginStep({ maskedEmail }: TwoFactorLoginStepProps) {
  const router = useRouter();
  const dispatch = useDispatch();

  const [code, setCode] = useState('');
  const [isResending, startResend] = useTransition();

  const [state, action, pending] = useActionState<TwoFactorState, FormData>(
    verifyTwoFactorLogin,
    { success: false },
  );

  useEffect(() => {
    if (state.success && state.redirectTo && state.user) {
      dispatch(userLoggedIn({ user: state.user as IUser }));
      notify('Signed in. Welcome back.');
      router.push(state.redirectTo);
    } else if (state.error) {
      notify(state.error);
    }
  }, [state, router, dispatch]);

  const handleResend = () => {
    startResend(async () => {
      const result = await resendTwoFactorCode();
      if (result.resent) {
        notify('A new code has been sent to your email');
      } else if (result.error) {
        notify(result.error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 animate-fade-up">
      <form action={action}>
        <div className="glass-from-sm">
          {/* Header */}
          <div className="border-b border-mist px-1 pt-6 pb-6 sm:px-8 sm:pt-8 text-center">
            <Image
              src="/logo-mark.png"
              alt=""
              width={56}
              height={56}
              className="mx-auto mb-3 h-14 w-14 object-contain"
            />
            <h1 className="font-serif text-[28px] leading-tight font-normal text-ink">
              Two-factor authentication
            </h1>
            <p className="mt-1 text-sm text-sage">
              Enter the 6-digit code we sent to{' '}
              {maskedEmail ? (
                <span className="font-semibold text-moss">{maskedEmail}</span>
              ) : (
                'your email'
              )}
            </p>
          </div>

          {/* Body */}
          <div className="space-y-5 px-1 py-6 sm:px-8">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-bold text-ink" htmlFor="code">
                Verification code
              </label>
              <input
                className="input-glass box-border w-full px-4 py-3 text-center text-lg font-semibold tracking-[0.5em] placeholder:font-normal placeholder:tracking-normal"
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="------"
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </div>

            <button
              type="submit"
              className="btn-dark w-full px-5 py-3.5 text-[15px]"
              disabled={pending}
            >
              {pending ? 'Verifying…' : 'Verify and sign in'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="cursor-pointer text-[13px] font-semibold text-pine hover:text-pine-deep disabled:opacity-50"
              >
                {isResending ? 'Sending…' : "Didn't get a code? Resend"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
