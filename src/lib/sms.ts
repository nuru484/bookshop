// src/lib/sms.ts
// Frog (Wigal) SMS - mirrors the dms-backend integration: API-KEY/USERNAME
// headers, GSM-7 sanitization, "ACCEPTD" success sentinel.
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';

const FROG_SEND_URL = 'https://frogapi.wigal.com.gh/api/v3/sms/send';

/**
 * Frog's text mode rejects non-GSM characters (returning an HTML error page,
 * not JSON) - normalize the usual suspects.
 */
const toGsm7Safe = (message: string): string =>
  message
    .replace(/[\u2013\u2014]/g, '-') // en/em dashes
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201f]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '-')
    .replace(/\u00a0/g, ' ');

/** Ghana-centric normalization to E.164 (no external deps). */
export const normalizeGhPhone = (raw: string): string | null => {
  const v = raw.trim().replace(/[()\s-]+/g, '');
  if (!v) return null;
  if (v.startsWith('+')) return v;
  if (v.startsWith('0') && v.length === 10) return `+233${v.slice(1)}`;
  if (v.startsWith('233')) return `+${v}`;
  return null;
};

/**
 * Sends one SMS. Throws on configuration/delivery failure - callers that
 * must not fail the main flow should go through dispatchOrderNotification.
 */
export const sendSMS = async (phoneNumber: string, message: string, msgid?: string): Promise<void> => {
  if (!ENV.FROG_API_KEY || !ENV.FROG_USERNAME) {
    throw new Error('SMS is not configured: set FROG_API_KEY and FROG_USERNAME.');
  }
  const destination = normalizeGhPhone(phoneNumber);
  if (!destination) throw new Error(`Unrecognized phone number format: ${phoneNumber}`);

  const response = await fetch(FROG_SEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-KEY': ENV.FROG_API_KEY,
      USERNAME: ENV.FROG_USERNAME,
    },
    body: JSON.stringify({
      senderid: ENV.FROG_SENDER_ID,
      destinations: [{ destination, msgid: msgid ?? `HB_${Date.now()}` }],
      message: toGsm7Safe(message),
      smstype: 'text',
    }),
  });

  const raw = await response.text();
  let data: { status?: string; message?: string };
  try {
    data = JSON.parse(raw) as { status?: string; message?: string };
  } catch {
    throw new Error(`Frog returned a non-JSON response (${response.status}): ${raw.slice(0, 120)}`);
  }

  // Frog's success sentinel is the literal "ACCEPTD".
  if (!response.ok || data.status !== 'ACCEPTD') {
    throw new Error(data.message ?? `SMS was not accepted (${data.status ?? response.status})`);
  }
};

export interface INotificationRecipient {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface INotificationMessage {
  /** Correlation tag for logs/msgid. */
  idTag: string;
  sms?: string;
  sendEmail?: () => Promise<void>;
}

/**
 * Multi-channel dispatch that NEVER throws - channel failures are logged so
 * request handlers can fire-and-forget without risking the main operation.
 */
export const dispatchOrderNotification = async (
  recipient: INotificationRecipient,
  message: INotificationMessage,
): Promise<void> => {
  if (recipient.phone && message.sms) {
    try {
      await sendSMS(recipient.phone, message.sms, `${message.idTag}_${Date.now()}`);
    } catch (err) {
      logger.warn(
        { idTag: message.idTag, reason: err instanceof Error ? err.message : String(err) },
        'Notification SMS failed',
      );
    }
  }
  if (recipient.email && message.sendEmail) {
    try {
      await message.sendEmail();
    } catch (err) {
      logger.warn(
        { idTag: message.idTag, reason: err instanceof Error ? err.message : String(err) },
        'Notification email failed',
      );
    }
  }
};
