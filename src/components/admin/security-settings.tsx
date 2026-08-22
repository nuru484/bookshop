// src/components/admin/security-settings.tsx
'use client';

import { useState } from 'react';
import {
  useChangePasswordMutation,
  useRequestTwoFactorSetupMutation,
  useConfirmTwoFactorSetupMutation,
  useDisableTwoFactorMutation,
} from '@/redux/user-api';
import { changePasswordSchema } from '@/validations/user-validation';
import { extractApiError } from '@/utils/extract-api-error';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { IUser } from '@/types/user.types';
import { FormError, useFieldErrors } from './form-field';

const fieldCls = 'input-glass px-3.5 py-3 text-[14.5px]';
const labelCls = 'text-[13px] font-bold';

/**
 * Password + two-factor controls for the signed-in user. Shared by the
 * profile page and the staff detail page, so a user reaching their own
 * record through the staff table is not given a downgraded experience.
 */
export function SecuritySettings({ me }: { me: IUser }) {
  const { confirm, dialog } = useConfirm();

  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation();
  const [requestSetup, { isLoading: requestingSetup }] = useRequestTwoFactorSetupMutation();
  const [confirmSetup, { isLoading: confirmingSetup }] = useConfirmTwoFactorSetupMutation();
  const [disableTfa, { isLoading: disablingTfa }] = useDisableTwoFactorMutation();

  const [editingPw, setEditingPw] = useState(false);
  const [cpw, setCpw] = useState('');
  const [npw, setNpw] = useState('');
  const [showCpw, setShowCpw] = useState(false);
  const [showNpw, setShowNpw] = useState(false);
  const {
    errors: pwErrors,
    setErrors: setPwErrors,
    formError: pwFormError,
    setFormError: setPwFormError,
    clearField: clearPwField,
  } = useFieldErrors<'currentPassword' | 'newPassword'>();

  const [tfaStep, setTfaStep] = useState<'idle' | 'confirming-code' | 'disabling'>('idle');
  const [tfaCode, setTfaCode] = useState('');
  const [tfaPassword, setTfaPassword] = useState('');
  const [showTfaPassword, setShowTfaPassword] = useState(false);
  const [tfaErr, setTfaErr] = useState('');

  const doUpdatePw = async () => {
    try {
      await changePassword({ userId: me.id, currentPassword: cpw, newPassword: npw }).unwrap();
      setCpw('');
      setNpw('');
      setEditingPw(false);
      notify('Password updated.');
    } catch (err) {
      const message = extractApiError(err).message;
      // "Current password is incorrect" belongs on that field, not the form.
      if (/current password/i.test(message)) setPwErrors({ currentPassword: message });
      else if (/new password/i.test(message)) setPwErrors({ newPassword: message });
      else setPwFormError(message);
    }
  };

  const updatePw = () => {
    const parsed = changePasswordSchema.safeParse({ currentPassword: cpw, newPassword: npw });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const key = issue?.path[0];
      if (key === 'currentPassword' || key === 'newPassword') {
        setPwErrors({ [key]: issue.message });
      } else {
        setPwFormError(issue?.message ?? 'Check the password fields.');
      }
      return;
    }
    setPwErrors({});
    setPwFormError('');
    confirm({
      title: 'Update your password?',
      description: 'You will use the new password the next time you sign in.',
      confirmText: 'Update password',
      onConfirm: doUpdatePw,
    });
  };

  const doStartEnableTfa = async () => {
    try {
      await requestSetup(me.id).unwrap();
      setTfaStep('confirming-code');
      setTfaCode('');
      notify('A confirmation code has been sent to your email.');
    } catch (err) {
      notify(extractApiError(err).message);
    }
  };

  const startEnableTfa = () => {
    setTfaErr('');
    confirm({
      title: 'Enable two-factor authentication?',
      description: `We'll email a 6-digit confirmation code to ${me.email}. You'll enter it in the next step.`,
      confirmText: 'Send code',
      onConfirm: doStartEnableTfa,
    });
  };

  const confirmEnableTfa = async () => {
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

  const doDisableTfa = async () => {
    try {
      await disableTfa({ userId: me.id, password: tfaPassword }).unwrap();
      setTfaStep('idle');
      setTfaPassword('');
      notify('Two-factor authentication has been disabled.');
    } catch (err) {
      setTfaErr(extractApiError(err).message);
    }
  };

  const confirmDisableTfa = () => {
    if (!tfaPassword) {
      setTfaErr('Enter your password to disable 2FA.');
      return;
    }
    setTfaErr('');
    confirm({
      title: 'Disable two-factor authentication?',
      description:
        'Signing in will only require your password again. You can re-enable 2FA at any time.',
      confirmText: 'Disable 2FA',
      isDestructive: true,
      onConfirm: doDisableTfa,
    });
  };

  return (
    <>
      {/* Password */}
      <div className="glass-from-sm mb-4 px-1 py-5 sm:px-7 sm:py-6">
        <div className="mb-3.5 text-xs font-bold tracking-[0.2em] text-sage uppercase">Password</div>

        {!editingPw ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-[1_1_240px]">
              <div className="text-[15px] font-semibold tracking-[0.2em] text-ink">••••••••</div>
              <div className="mt-1 text-[12.5px] text-sage">
                Use a strong password you don&apos;t use anywhere else.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingPw(true)}
              className="btn-outline-pine px-5 py-2.5 text-[13px]"
            >
              Change password
            </button>
          </div>
        ) : (
          <>
            <div className="mb-2.5 flex flex-wrap gap-4">
              <div className="flex flex-[1_1_200px] flex-col gap-1.5">
                <label className={labelCls} htmlFor="pw-current">
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="pw-current"
                    type={showCpw ? 'text' : 'password'}
                    value={cpw}
                    onChange={(e) => {
                      setCpw(e.target.value);
                      clearPwField('currentPassword');
                    }}
                    aria-invalid={Boolean(pwErrors.currentPassword)}
                    aria-describedby={pwErrors.currentPassword ? 'pw-current-error' : undefined}
                    placeholder="••••••••"
                    className={cn(
                      fieldCls,
                      'box-border w-full pr-[68px]',
                      pwErrors.currentPassword && 'border-rust',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCpw((v) => !v)}
                    className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-none bg-transparent p-2 text-xs font-bold text-sage hover:text-pine"
                  >
                    {showCpw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {pwErrors.currentPassword && (
                  <p id="pw-current-error" className="text-[12.5px] font-medium text-rust">
                    {pwErrors.currentPassword}
                  </p>
                )}
              </div>
              <div className="flex flex-[1_1_200px] flex-col gap-1.5">
                <label className={labelCls} htmlFor="pw-new">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="pw-new"
                    type={showNpw ? 'text' : 'password'}
                    value={npw}
                    onChange={(e) => {
                      setNpw(e.target.value);
                      clearPwField('newPassword');
                    }}
                    aria-invalid={Boolean(pwErrors.newPassword)}
                    aria-describedby={pwErrors.newPassword ? 'pw-new-error' : undefined}
                    placeholder="Upper, lower, number, symbol"
                    className={cn(
                      fieldCls,
                      'box-border w-full pr-[68px]',
                      pwErrors.newPassword && 'border-rust',
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNpw((v) => !v)}
                    className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-none bg-transparent p-2 text-xs font-bold text-sage hover:text-pine"
                  >
                    {showNpw ? 'Hide' : 'Show'}
                  </button>
                </div>
                {pwErrors.newPassword && (
                  <p id="pw-new-error" className="text-[12.5px] font-medium text-rust">
                    {pwErrors.newPassword}
                  </p>
                )}
              </div>
            </div>
            <FormError message={pwFormError} />
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={updatePw}
                disabled={changingPw}
                className="btn-dark px-[22px] py-3 text-[13.5px]"
              >
                {changingPw ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPw(false);
                  setCpw('');
                  setNpw('');
                  setPwErrors({});
                  setPwFormError('');
                }}
                className="btn-quiet px-5 py-3 text-[13.5px]"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {/* Two-factor authentication */}
      <div className="glass-from-sm px-1 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-[1_1_240px]">
            <div className="mb-1 text-sm font-bold">Two-factor authentication</div>
            <div className="text-[13px] text-sage">
              {me.twoFactorEnabled
                ? 'Enabled - a 6-digit code is emailed to you at sign-in.'
                : 'Off - add a second step to protect the console.'}
            </div>
          </div>
          {tfaStep === 'idle' &&
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
                onClick={startEnableTfa}
                disabled={requestingSetup}
                className="cursor-pointer border-[1.5px] border-pine bg-pine px-5 py-2.5 text-[13px] font-bold text-cream-bright disabled:opacity-60"
              >
                {requestingSetup ? 'Sending code…' : 'Enable 2FA'}
              </button>
            ))}
        </div>

        {tfaStep === 'confirming-code' && (
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
                className="input-glass w-[140px] px-3.5 py-2.5 text-center text-[15px] font-semibold tracking-[0.4em] placeholder:font-normal placeholder:tracking-normal"
              />
              <button
                type="button"
                onClick={() => void confirmEnableTfa()}
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

        {tfaStep === 'disabling' && (
          <div className="mt-4 border-t border-mist pt-4">
            <div className="mb-2 text-[13px] text-moss">
              Confirm your password to turn two-factor authentication off.
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <input
                  type={showTfaPassword ? 'text' : 'password'}
                  value={tfaPassword}
                  onChange={(e) => {
                    setTfaPassword(e.target.value);
                    setTfaErr('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className="input-glass box-border w-[220px] py-2.5 pr-[64px] pl-3.5 text-[14px]"
                />
                <button
                  type="button"
                  onClick={() => setShowTfaPassword((v) => !v)}
                  className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer border-none bg-transparent p-1.5 text-xs font-bold text-sage hover:text-pine"
                >
                  {showTfaPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button
                type="button"
                onClick={confirmDisableTfa}
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

        {tfaErr && <div className="mt-2.5 text-[12.5px] font-medium text-rust">{tfaErr}</div>}
      </div>
      {dialog}
    </>
  );
}
