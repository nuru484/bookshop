// src/lib/order-utils.ts
// Shared order math used by direct order creation and Paystack initialize -
// totals are only ever computed server-side.
import 'server-only';
import { BadRequestError } from '@/middlewares/error-handler';
import { DELIVERY_FEE, FREE_DELIVERY_OVER } from '@/data/catalog';
import type { Prisma, Book as DbBook } from '@/lib/prisma';

export interface IPricedLine {
  bookId: number;
  qty: number;
  unitPrice: number;
  title: string;
}

export interface IOrderPricing {
  lines: IPricedLine[];
  subtotal: number;
  discount: number;
  fee: number;
  total: number;
}

/**
 * Validates basket items against live stock and computes the totals.
 * Throws user-ready BadRequestErrors for missing titles / short stock.
 */
export interface IActivePromo {
  percentOff: number;
  genre: string | null;
}

export const priceOrder = (
  books: DbBook[],
  items: { id: number; qty: number }[],
  promo?: IActivePromo | null,
): IOrderPricing => {
  let subtotal = 0;
  let promoSubtotal = 0;
  const lines = items.map((item) => {
    const book = books.find((b) => b.id === item.id);
    if (!book) throw new BadRequestError('One of the titles in your basket no longer exists.');
    if (book.status !== 'Published') {
      throw new BadRequestError(`"${book.title}" is no longer available in the shop.`);
    }
    if (book.stock < item.qty) {
      throw new BadRequestError(
        book.stock === 0
          ? `"${book.title}" has just sold out.`
          : `Only ${book.stock} cop${book.stock === 1 ? 'y' : 'ies'} of "${book.title}" left.`,
      );
    }
    subtotal += book.price * item.qty;
    if (!promo?.genre || book.genre === promo.genre) promoSubtotal += book.price * item.qty;
    return { bookId: book.id, qty: item.qty, unitPrice: book.price, title: book.title };
  });

  const discount = promo ? (promoSubtotal * promo.percentOff) / 100 : 0;
  const fee = subtotal - discount >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;

  return { lines, subtotal, discount, fee, total: Math.max(0, subtotal - discount + fee) };
};

/** Resolves an active promo code (case-insensitive); null when unknown/paused. */
export const resolvePromo = async (
  tx: Prisma.TransactionClient | { promo: { findFirst: (args: unknown) => Promise<{ percentOff: number; genre: string | null } | null> } },
  code?: string,
): Promise<IActivePromo | null> => {
  const trimmed = code?.trim().toUpperCase();
  if (!trimmed) return null;
  const promo = await (tx as Prisma.TransactionClient).promo.findFirst({
    where: { code: trimmed, active: true },
    select: { percentOff: true, genre: true },
  });
  return promo ?? null;
};

/** Next order id: HB-<max + 1>. */
export const nextOrderId = async (tx: Prisma.TransactionClient): Promise<string> => {
  const last = await tx.order.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true } });
  const lastNum = last ? parseInt(last.id.replace(/\D/g, ''), 10) : 2431;
  return `HB-${(Number.isNaN(lastNum) ? 2431 : lastNum) + 1}`;
};
