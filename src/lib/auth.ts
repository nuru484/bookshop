// src/lib/auth.ts
'use server';
import { headers } from 'next/headers';
import prisma, { UserSecurityTokenType } from './prisma';
import bcrypt from 'bcrypt';
import { createSession, deleteSession } from './session';
import {
  setTwoFactorPending,
  getTwoFactorPendingUserId,
  clearTwoFactorPending,
} from './two-factor-session';
import {
  generateOtpCode,
  generateResetToken,
  issueUserSecurityToken,
  verifyUserOtp,
  otpFailureMessage,
  consumePasswordResetToken,
  revokeAllUserSecurityTokens,
  TWO_FACTOR_CODE_TTL_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
} from '@/utils/user-security-tokens';
import {
  sendTwoFactorCodeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '@/lib/mail/auth-emails';
import { ENV } from '@/config/env';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import { SigninSchema } from '@/validations/signin-validation';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/validations/password-reset-validation';
import { IUser } from '@/types/user.types';
import { ratelimit } from '@/lib/rate-limit';

type FormErrors = {
  email?: string[];
  password?: string[];
  _form?: string[];
};

export type SigninState = {
  success: boolean;
  redirectTo?: string;
  user?: IUser;
  errors?: FormErrors;
  /** Set when the password was correct but a 2FA code is now required. */
  requiresTwoFactor?: boolean;
  /** Masked destination address shown on the 2FA step, e.g. "ab***@gmail.com". */
  maskedEmail?: string;
};

export type TwoFactorState = {
  success: boolean;
  redirectTo?: string;
  user?: IUser;
  error?: string;
  resent?: boolean;
};

export type ForgotPasswordState = {
  success: boolean;
  message?: string;
  error?: string;
};

export type ResetPasswordState = {
  success: boolean;
  redirectTo?: string;
  message?: string;
  errors?: { token?: string[]; password?: string[]; _form?: string[] };
};

/** Shared IP-based throttle used by the login and 2FA challenge actions. */
async function checkRateLimit(): Promise<{ allowed: boolean; retrySecs: number }> {
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  const { success, reset } = await ratelimit.limit(ip);
  return { allowed: success, retrySecs: Math.ceil((reset - Date.now()) / 1000) };
}

/** Masks an email for display on the 2FA step, e.g. "ab***@gmail.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

async function getUser(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullname: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export async function signin(
  _state: SigninState,
  formData: FormData,
): Promise<SigninState> {
  // --- Rate limiting ---
  const { allowed, retrySecs } = await checkRateLimit();
  if (!allowed) {
    return {
      success: false,
      errors: {
        _form: [
          `Too many login attempts. Please try again in ${retrySecs} seconds.`,
        ],
      },
    };
  }
  // --- End rate limiting ---

  const parsedCredentials = SigninSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsedCredentials.success) {
    return {
      success: false,
      errors: parsedCredentials.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsedCredentials.data;

  const user = await getUser(email);

  if (!user) {
    return {
      success: false,
      errors: { _form: ['Invalid email or password'] },
    };
  }

  const passwordsMatch = await bcrypt.compare(password, user.password);

  if (!passwordsMatch) {
    return {
      success: false,
      errors: { _form: ['Invalid email or password'] },
    };
  }

  // 2FA-enabled accounts get a code challenge instead of a session: the pending
  // cookie proves the password step, the emailed code proves the mailbox, and
  // only the pair unlocks a session via verifyTwoFactorLogin.
  if (user.twoFactorEnabled) {
    const code = generateOtpCode();
    await issueUserSecurityToken(
      user.id,
      UserSecurityTokenType.TWO_FACTOR_LOGIN,
      code,
      TWO_FACTOR_CODE_TTL_MINUTES,
    );
    await sendTwoFactorCodeEmail(user, code, 'login');
    await setTwoFactorPending(user.id);

    return {
      success: false,
      requiresTwoFactor: true,
      maskedEmail: maskEmail(user.email),
    };
  }

  await createSession(user.id, user.role);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safeUser } = user;

  return {
    success: true,
    redirectTo: user.role === 'CUSTOMER' ? '/account' : '/admin',
    user: safeUser,
  };
}

/**
 * Step 2 of a 2FA login: exchange the emailed code (plus the pending cookie set
 * at password verification) for a real session.
 */
export async function verifyTwoFactorLogin(
  _state: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const { allowed, retrySecs } = await checkRateLimit();
  if (!allowed) {
    return {
      success: false,
      error: `Too many attempts. Please try again in ${retrySecs} seconds.`,
    };
  }

  const userId = await getTwoFactorPendingUserId();
  if (!userId) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const code = String(formData.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return { success: false, error: 'Enter the 6-digit code from your email' };
  }

  const result = await verifyUserOtp(
    userId,
    UserSecurityTokenType.TWO_FACTOR_LOGIN,
    code,
  );
  if (!result.ok) {
    return {
      success: false,
      error: otpFailureMessage(result.reason, result.attemptsLeft),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullname: true,
      phone: true,
      role: true,
      twoFactorEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  await clearTwoFactorPending();
  await createSession(user.id, user.role);

  return {
    success: true,
    redirectTo: user.role === 'CUSTOMER' ? '/account' : '/admin',
    user,
  };
}

/** Re-sends the login code while a 2FA challenge is pending. */
export async function resendTwoFactorCode(): Promise<TwoFactorState> {
  const { allowed, retrySecs } = await checkRateLimit();
  if (!allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${retrySecs} seconds.`,
    };
  }

  const userId = await getTwoFactorPendingUserId();
  if (!userId) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullname: true, email: true },
  });
  if (!user) {
    return {
      success: false,
      error: 'Your login session expired. Please sign in again.',
    };
  }

  const code = generateOtpCode();
  await issueUserSecurityToken(
    user.id,
    UserSecurityTokenType.TWO_FACTOR_LOGIN,
    code,
    TWO_FACTOR_CODE_TTL_MINUTES,
  );
  await sendTwoFactorCodeEmail(user, code, 'login');

  return { success: false, resent: true };
}

/**
 * Starts a password reset. Always answers with the same generic message so the
 * action cannot be used to probe which emails have accounts.
 */
export async function forgotPassword(
  _state: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const { allowed, retrySecs } = await checkRateLimit();
  if (!allowed) {
    return {
      success: false,
      error: `Too many requests. Please try again in ${retrySecs} seconds.`,
    };
  }

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get('email'),
  });
  if (!parsed.success) {
    return { success: false, error: 'Enter a valid email address.' };
  }

  const genericMessage =
    'If an account exists for that email, a reset link has been sent.';

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, fullname: true, email: true },
  });

  if (user) {
    const token = generateResetToken();
    await issueUserSecurityToken(
      user.id,
      UserSecurityTokenType.PASSWORD_RESET,
      token,
      PASSWORD_RESET_TTL_MINUTES,
    );
    const resetUrl = `${ENV.BASE_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user, resetUrl);
  }

  return { success: true, message: genericMessage };
}

/** Completes a reset: consumes the emailed token and sets the new password. */
export async function resetPassword(
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const { allowed, retrySecs } = await checkRateLimit();
  if (!allowed) {
    return {
      success: false,
      errors: {
        _form: [`Too many attempts. Please try again in ${retrySecs} seconds.`],
      },
    };
  }

  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { token, password } = parsed.data;

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return {
      success: false,
      errors: {
        _form: [
          'This reset link is invalid or has expired. Please request a new one.',
        ],
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
    select: { id: true, fullname: true, email: true },
  });

  // Any other outstanding codes/links predate the new password - drop them.
  await revokeAllUserSecurityTokens(userId);
  await sendPasswordChangedEmail(user);

  return {
    success: true,
    redirectTo: '/login',
    message: 'Your password has been reset. You can now sign in.',
  };
}

export async function logout(): Promise<void> {
  await deleteSession();
}
