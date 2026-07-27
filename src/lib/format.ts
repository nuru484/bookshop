// src/lib/format.ts
import type { Book, Order } from '@/data/catalog';

/** "GH₵1,234.5" - the shop's price format. */
export const fmtCedis = (n: number): string =>
  `GH₵${Number(n).toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;

/** "★★★★☆" for a 0-5 rating. */
export const stars = (rating: number): string => {
  const r = Math.round(rating);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
};

/** "26 Jul 2026" from an ISO date or datetime string. */
export const fmtDate = (iso: string): string => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "2:32 pm" from an ISO datetime string; empty when no time part. */
export const fmtTime = (iso: string): string => {
  if (iso.length <= 10) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

/** "800 BC" for negative years, plain year otherwise. */
export const yearLabel = (year: number): string =>
  year < 0 ? `${Math.abs(year)} BC` : String(year);

/** "SA" from "Selasi Amoah". */
export const initials = (name: string): string =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Order line-items total against the current book list. */
export const orderTotal = (order: Order, books: Book[]): number =>
  order.items.reduce((sum, item) => {
    const book = books.find((b) => b.id === item.id);
    return sum + (book ? book.price * item.qty : 0);
  }, 0);

/** "Pride and Prejudice, Emma ×2" summary of an order's items. */
export const orderSummary = (order: Order, books: Book[]): string =>
  order.items
    .map((item) => {
      const book = books.find((b) => b.id === item.id);
      return book ? `${book.title}${item.qty > 1 ? ` ×${item.qty}` : ''}` : '';
    })
    .filter(Boolean)
    .join(', ');

export const AVATAR_COLORS = ['#2E6B4F', '#5A4632', '#34506B', '#8A4A5C', '#2E6B4F', '#C2A65A'];
export const avatarColor = (index: number): string => AVATAR_COLORS[index % AVATAR_COLORS.length];
