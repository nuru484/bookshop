// src/lib/mail/shell.ts
// Shared branded email shell - inline styles only (email clients).
import 'server-only';
import { ENV } from '@/config/env';

export const emailShell = (inner: string): string => `
  <div style="max-width: 560px; margin: 0 auto; border: 1px solid #DCE3D8; background: #F7F9F5;">
    <div style="background: #1C2A21; padding: 26px 28px; text-align: center;">
      <img src="${ENV.BASE_URL}/logo-mark-light.png" width="64" height="64" alt="" style="display: block; margin: 0 auto 10px; width: 64px; height: 64px;">
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

export const heading = (text: string): string =>
  `<h2 style="font: 400 24px Georgia, 'Times New Roman', serif; color: #1C2A21; margin: 0 0 16px;">${text}</h2>`;

export const paragraph = (text: string): string =>
  `<p style="margin: 0 0 16px; font-size: 14.5px; line-height: 1.65; color: #45543F;">${text}</p>`;

export const fineprint = (text: string): string =>
  `<p style="margin: 0; color: #6A7A66; font-size: 12.5px; line-height: 1.6;">${text}</p>`;

export const ctaButton = (href: string, label: string): string => `
  <div style="text-align: center; margin: 24px 0;">
    <a href="${href}" style="display: inline-block; background: #2E6B4F; color: #F1F6EF; padding: 13px 28px; font-weight: bold; font-size: 14px; text-decoration: none; font-family: Arial, sans-serif;">${label}</a>
  </div>`;
