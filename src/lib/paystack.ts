// src/lib/paystack.ts
// Paystack client mirroring the dms-backend integration: timeout-wrapped
// fetch, text-then-parse error handling, timing-safe webhook signatures.
import 'server-only';
import crypto from 'crypto';
import { ENV } from '@/config/env';
import { BadRequestError, InternalServerError } from '@/middlewares/error-handler';

const TIMEOUT_MS = 20_000;

const secretKey = (): string => {
  if (!ENV.PAYSTACK_SECRET_KEY) {
    throw new InternalServerError('Payments are not configured: set PAYSTACK_SECRET_KEY.');
  }
  return ENV.PAYSTACK_SECRET_KEY;
};

const paystackFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new BadRequestError(`Paystack request timed out after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Format: HBPS-YYYYMMDD-XXXXXXXXXXXXXXXX. */
export const generatePaystackReference = (): string => {
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `HBPS-${yyyymmdd}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

export interface IPaystackInitResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export const initializePaystackTransaction = async (payload: {
  email: string;
  /** Amount in pesewas (GHS × 100). */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<IPaystackInitResult> => {
  const res = await paystackFetch(`${ENV.PAYSTACK_API_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      amount: payload.amount,
      currency: 'GHS',
      reference: payload.reference,
      callback_url: payload.callbackUrl,
      metadata: payload.metadata ?? {},
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let message = `Paystack init failed (${res.status})`;
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (parsed.message) message = `Paystack error: ${parsed.message}`;
    } catch {
      message = `Paystack init failed (${res.status}): ${raw.slice(0, 100)}`;
    }
    throw new BadRequestError(message);
  }

  let parsed: {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestError('Paystack returned a non-JSON response on init');
  }
  if (!parsed.status || !parsed.data) {
    throw new BadRequestError(`Paystack init returned failure: ${parsed.message ?? 'Unknown error'}`);
  }

  return {
    authorizationUrl: parsed.data.authorization_url,
    accessCode: parsed.data.access_code,
    reference: parsed.data.reference,
  };
};

export interface IPaystackVerifiedTransaction {
  /** Paystack's own status string - "failed"/"abandoned" are valid values, not errors. */
  status: string;
  /** Amount in pesewas. */
  amount: number;
  currency: string;
  reference: string;
  paidAt: string | null;
  channel: string | null;
}

export const verifyPaystackTransaction = async (
  reference: string,
): Promise<IPaystackVerifiedTransaction> => {
  const res = await paystackFetch(
    `${ENV.PAYSTACK_API_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { method: 'GET', headers: { Authorization: `Bearer ${secretKey()}` } },
  );

  const raw = await res.text();
  if (!res.ok) {
    throw new BadRequestError(`Paystack verify failed (${res.status}): ${raw.slice(0, 300)}`);
  }

  let parsed: {
    status: boolean;
    message: string;
    data?: {
      status: string;
      amount: number;
      currency: string;
      reference: string;
      paid_at: string | null;
      channel: string | null;
    };
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestError('Paystack returned a non-JSON response on verify');
  }
  if (!parsed.status || !parsed.data) {
    throw new BadRequestError(`Paystack verify returned failure: ${parsed.message ?? 'Unknown error'}`);
  }

  return {
    status: parsed.data.status,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    reference: parsed.data.reference,
    paidAt: parsed.data.paid_at,
    channel: parsed.data.channel,
  };
};

export interface IPaystackRefund {
  reference: string;
  status: string;
  amount: number;
}

/**
 * Refunds a transaction (full refund unless `amount` in pesewas is given).
 * Paystack treats a second refund of the same transaction as an error, so
 * callers must guard on their own refund trail first.
 */
export const refundPaystackTransaction = async (
  transactionReference: string,
  amountPesewas?: number,
): Promise<IPaystackRefund> => {
  const res = await paystackFetch(`${ENV.PAYSTACK_API_BASE_URL}/refund`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction: transactionReference,
      ...(amountPesewas ? { amount: amountPesewas } : {}),
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let message = `Paystack refund failed (${res.status})`;
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      if (parsed.message) message = `Paystack refund error: ${parsed.message}`;
    } catch {
      message = `Paystack refund failed (${res.status}): ${raw.slice(0, 120)}`;
    }
    throw new BadRequestError(message);
  }

  let parsed: {
    status: boolean;
    message: string;
    data?: { transaction?: { reference?: string }; status?: string; amount?: number; id?: number };
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BadRequestError('Paystack returned a non-JSON response on refund');
  }
  if (!parsed.status || !parsed.data) {
    throw new BadRequestError(`Paystack refund returned failure: ${parsed.message ?? 'Unknown error'}`);
  }

  return {
    reference:
      parsed.data.transaction?.reference ?? String(parsed.data.id ?? transactionReference),
    status: parsed.data.status ?? 'pending',
    amount: parsed.data.amount ?? amountPesewas ?? 0,
  };
};

/** HMAC-SHA512 of the raw body, timing-safe comparison. */
export const verifyPaystackSignature = (rawBody: string, signature: string | undefined): boolean => {
  if (!signature || !ENV.PAYSTACK_SECRET_KEY) return false;
  const computed = crypto
    .createHmac('sha512', ENV.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  const computedBuf = Buffer.from(computed, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  if (computedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, signatureBuf);
};
