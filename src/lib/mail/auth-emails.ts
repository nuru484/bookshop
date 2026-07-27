// src/lib/mail/auth-emails.ts
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { getTransporter } from './transporter';
import {
  TWO_FACTOR_CODE_TTL_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
} from '@/utils/user-security-tokens';

/**
 * Shared branded shell for every email the shop sends: ink masthead with the
 * serif wordmark and gold tagline, canvas body, muted footer. Inline styles
 * only - email clients ignore stylesheets.
 */
const emailShell = (inner: string): string => `
  <div style="max-width: 560px; margin: 0 auto; border: 1px solid #DCE3D8; background: #F7F9F5;">
    <div style="background: #1C2A21; padding: 26px 28px; text-align: center;">
      <div style="font: 400 26px Georgia, 'Times New Roman', serif; color: #F3F6F0;">Harmattan Books</div>
      <div style="font: 700 10px Arial, sans-serif; letter-spacing: .26em; color: #C2A65A; text-transform: uppercase; margin-top: 7px;">Independent booksellers · Tamale</div>
    </div>
    <div style="padding: 28px; font-family: Arial, Helvetica, sans-serif; color: #1C2A21;">
      ${inner}
    </div>
    <div style="padding: 16px 28px; background: #EFF3EC; border-top: 1px solid #DCE3D8; font: 400 11.5px Arial, sans-serif; color: #6A7A66; text-align: center; line-height: 1.7;">
      ${ENV.EMAIL_FROM_NAME} · Tamale, Northern Region, Ghana<br>
      You are receiving this because of activity on your ${ENV.EMAIL_FROM_NAME} account.
    </div>
  </div>`;

const heading = (text: string): string =>
  `<h2 style="font: 400 24px Georgia, 'Times New Roman', serif; color: #1C2A21; margin: 0 0 16px;">${text}</h2>`;

const paragraph = (text: string): string =>
  `<p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.65; color: #45543F;">${text}</p>`;

const fineprint = (text: string): string =>
  `<p style="margin: 0; color: #6A7A66; font-size: 12.5px; line-height: 1.6;">${text}</p>`;

const codeBlock = (code: string): string => `
  <div style="background: #1C2A21; color: #F3F6F0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 20px 0; font-family: Georgia, serif;">
    ${code}
  </div>`;

const buildTwoFactorHtml = (
  recipientName: string,
  purpose: 'login' | 'setup',
  code: string,
): string =>
  emailShell(`
    ${heading(purpose === 'login' ? 'Your login code' : 'Confirm two-factor setup')}
    ${paragraph(`Hi ${recipientName},`)}
    ${paragraph(
      purpose === 'login'
        ? 'Use the code below to finish signing in to the staff console:'
        : 'Use the code below to confirm enabling two-factor authentication on your account:',
    )}
    ${codeBlock(code)}
    ${paragraph(`This code expires in ${TWO_FACTOR_CODE_TTL_MINUTES} minutes.`)}
    ${fineprint(
      `If you did not request this, you can safely ignore this email${
        purpose === 'login'
          ? ' - but consider changing your password, since someone may know it'
          : ''
      }.`,
    )}
  `);

/**
 * Emails a two-factor authentication code. Fire-and-forget at the call site:
 * failures are logged and swallowed so a transient mail error never leaks
 * whether an account exists or blocks the request flow.
 */
export const sendTwoFactorCodeEmail = async (
  user: { id: string; fullname: string; email: string },
  code: string,
  purpose: 'login' | 'setup',
): Promise<void> => {
  const title = purpose === 'login' ? 'Your Login Code' : 'Confirm Two-Factor Setup';

  try {
    await getTransporter().sendMail({
      from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.GMAIL_USER}>`,
      to: user.email,
      subject: `${title} - ${ENV.EMAIL_FROM_NAME}`,
      html: buildTwoFactorHtml(user.fullname, purpose, code),
    });
  } catch (error) {
    logger.error({ error, userId: user.id, purpose }, 'Failed to send two-factor code email');
  }
};

/**
 * Emails a password-reset link. Fire-and-forget: failures are logged and
 * swallowed so the forgot-password endpoint stays generic and non-blocking.
 */
export const sendPasswordResetEmail = async (
  user: { id: string; fullname: string; email: string },
  resetUrl: string,
): Promise<void> => {
  const html = emailShell(`
    ${heading('Reset your password')}
    ${paragraph(`Hi ${user.fullname},`)}
    ${paragraph('We received a request to reset the password for your staff console account.')}
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: #2E6B4F; color: #F1F6EF; padding: 13px 28px; font-weight: bold; font-size: 14px; text-decoration: none; font-family: Arial, sans-serif;">Reset password</a>
    </div>
    ${paragraph(`This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.`)}
    ${paragraph("If the button doesn't work, copy and paste this link into your browser:")}
    <p style="margin: 0 0 16px; word-break: break-all; font-size: 12.5px; color: #6A7A66;">${resetUrl}</p>
    ${fineprint('If you did not request a password reset, you can safely ignore this email - your password will not change.')}
  `);

  try {
    await getTransporter().sendMail({
      from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.GMAIL_USER}>`,
      to: user.email,
      subject: `Reset your password - ${ENV.EMAIL_FROM_NAME}`,
      html,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to send password reset email');
  }
};

/** Notifies a user that their password was just changed. Fire-and-forget. */
export const sendPasswordChangedEmail = async (user: {
  id: string;
  fullname: string;
  email: string;
}): Promise<void> => {
  const html = emailShell(`
    ${heading('Password changed')}
    ${paragraph(`Hi ${user.fullname},`)}
    ${paragraph('This is a confirmation that the password for your staff console account was just changed.')}
    ${paragraph('If this was you, no further action is needed.')}
    ${fineprint('If you did <strong>not</strong> make this change, contact an administrator immediately.')}
  `);

  try {
    await getTransporter().sendMail({
      from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.GMAIL_USER}>`,
      to: user.email,
      subject: `Your password was changed - ${ENV.EMAIL_FROM_NAME}`,
      html,
    });
  } catch (error) {
    logger.error({ error, userId: user.id }, 'Failed to send password changed email');
  }
};
