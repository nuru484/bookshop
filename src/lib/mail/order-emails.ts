// src/lib/mail/order-emails.ts
import 'server-only';
import { ENV } from '@/config/env';
import logger from '@/utils/logger';
import { getTransporter } from './transporter';
import { emailShell, heading, paragraph, fineprint, ctaButton } from './shell';

export interface IOrderEmailLine {
  title: string;
  qty: number;
  lineTotal: number;
}

export interface IOrderEmailPayload {
  orderId: string;
  name: string;
  email: string;
  total: number;
  lines: IOrderEmailLine[];
}

const cedis = (n: number): string =>
  `GHS ${Number(n).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

const linesTable = (lines: IOrderEmailLine[], total: number): string => `
  <table style="width: 100%; border-collapse: collapse; margin: 0 0 16px;">
    ${lines
      .map(
        (l) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #DCE3D8; font: 400 13.5px Arial, sans-serif; color: #45543F;">${l.title} × ${l.qty}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #DCE3D8; font: 700 13.5px Arial, sans-serif; text-align: right;">${cedis(l.lineTotal)}</td>
      </tr>`,
      )
      .join('')}
    <tr>
      <td style="padding: 10px 0; font: 700 15px Arial, sans-serif;">Total</td>
      <td style="padding: 10px 0; font: 700 15px Arial, sans-serif; text-align: right;">${cedis(total)}</td>
    </tr>
  </table>`;

const send = async (to: string, subject: string, html: string, context: string): Promise<void> => {
  try {
    await getTransporter().sendMail({
      from: `"${ENV.EMAIL_FROM_NAME}" <${ENV.GMAIL_USER}>`,
      to,
      subject: `${subject} - ${ENV.EMAIL_FROM_NAME}`,
      html,
    });
  } catch (error) {
    logger.error({ error, to, context }, 'Failed to send order email');
  }
};

/** Customer receipt after a verified payment. Fire-and-forget. */
export const sendOrderConfirmedEmail = async (order: IOrderEmailPayload): Promise<void> => {
  const trackUrl = `${ENV.BASE_URL}/track-order`;
  const html = emailShell(`
    ${heading('Your order is confirmed')}
    ${paragraph(`Hi ${order.name},`)}
    ${paragraph(`Thank you - your payment went through and order <strong>${order.orderId}</strong> is being wrapped in brown paper as we speak.`)}
    ${linesTable(order.lines, order.total)}
    ${ctaButton(trackUrl, 'Track your order')}
    ${fineprint(`Quote order ${order.orderId} with the email or phone you used at checkout to follow its journey.`)}
  `);
  await send(order.email, `Order ${order.orderId} confirmed`, html, 'order-confirmed');
};

/** Customer notice when staff move an order along (or cancel it). */
export const sendOrderStatusEmail = async (
  order: IOrderEmailPayload,
  status: string,
): Promise<void> => {
  const copy =
    status === 'Shipped'
      ? 'Your books are on the road. Delivery in Tamale usually takes 1-2 days, nationwide 2-4 days.'
      : status === 'Delivered'
        ? 'Your order has been delivered. We hope the first chapter is already underway.'
        : status === 'Cancelled'
          ? 'Your order has been cancelled and your payment refunded via Paystack. The copies are back on the shelf for someone else.'
          : `Your order is now marked ${status}.`;
  const html = emailShell(`
    ${heading(`Order ${order.orderId}: ${status}`)}
    ${paragraph(`Hi ${order.name},`)}
    ${paragraph(copy)}
    ${linesTable(order.lines, order.total)}
    ${ctaButton(`${ENV.BASE_URL}/track-order`, 'Track your order')}
  `);
  await send(order.email, `Order ${order.orderId} ${status.toLowerCase()}`, html, 'order-status');
};

/** Heads-up to the shop inbox when a new paid order lands. */
export const sendAdminNewOrderEmail = async (order: IOrderEmailPayload): Promise<void> => {
  const to = ENV.ADMIN_EMAIL;
  const html = emailShell(`
    ${heading('New order in the shop')}
    ${paragraph(`<strong>${order.orderId}</strong> from ${order.name} (${order.email}) has just been paid.`)}
    ${linesTable(order.lines, order.total)}
    ${ctaButton(`${ENV.BASE_URL}/admin/orders/${order.orderId}`, 'Open in the console')}
  `);
  await send(to, `New order ${order.orderId}`, html, 'admin-new-order');
};
