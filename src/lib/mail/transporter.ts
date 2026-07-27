// src/lib/mail/transporter.ts
import 'server-only';
import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '@/config/env';

let cachedTransporter: Transporter | null = null;

/**
 * Lazily builds (and caches) the Gmail SMTP transporter. Throws a clear error
 * if the Gmail credentials are not configured - 2FA cannot work without them.
 */
export const getTransporter = (): Transporter => {
  if (!ENV.GMAIL_USER || !ENV.GMAIL_PASSWORD) {
    throw new Error(
      'Email is not configured: set GMAIL_USER and GMAIL_PASSWORD to send 2FA codes.',
    );
  }

  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ENV.GMAIL_USER,
      pass: ENV.GMAIL_PASSWORD,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });

  return cachedTransporter;
};
