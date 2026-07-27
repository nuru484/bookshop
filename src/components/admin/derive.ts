// src/components/admin/derive.ts
// Derived data shared by the admin pages - mirrors the design's renderVals().
import type { Book, Order } from '@/data/catalog';
import { orderTotal } from '@/lib/format';

export interface OrderWithTotal extends Order {
  total: number;
  count: number;
}

export const withTotals = (orders: Order[], books: Book[]): OrderWithTotal[] =>
  orders.map((o) => ({
    ...o,
    total: orderTotal(o, books),
    count: o.items.reduce((s, i) => s + i.qty, 0),
  }));

export interface CustomerSummary {
  name: string;
  email: string;
  city: string;
  count: number;
  spent: number;
  last: string;
}

/** Group orders by customer email, spend excludes cancelled orders. */
export const customersFromOrders = (orders: OrderWithTotal[]): CustomerSummary[] => {
  const byEmail: Record<string, CustomerSummary> = {};
  orders.forEach((o) => {
    if (!byEmail[o.email]) {
      byEmail[o.email] = { name: o.name, email: o.email, city: o.city, count: 0, spent: 0, last: '' };
    }
    const c = byEmail[o.email];
    c.count += 1;
    if (o.status !== 'Cancelled') c.spent += o.total;
    if (o.date > c.last) c.last = o.date;
  });
  return Object.values(byEmail).sort((a, b) => b.spent - a.spent);
};

/** Shelf colors used by the dashboard's category-share chart. */
export const CATEGORY_COLORS: Record<string, string> = {
  Romance: '#8A4A5C',
  Gothic: '#3A4740',
  Literary: '#2E6B4F',
  Adventure: '#34506B',
  Epic: '#C2A65A',
};

export const FUNNEL_COLORS = ['#1C2A21', '#5A4632', '#2E6B4F', '#C2A65A'];

/** "Sunday 26 July 2026" (en-GB long date without the comma). */
export const longDate = (date: Date): string =>
  date
    .toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(/,/g, '');

export const greeting = (date: Date): string => {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

/** Shift an ISO date string by N days. */
export const shiftIso = (iso: string, days: number): string => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Length-aware font sizing for stat-tile values so large amounts
 * (GH₵12,540,000.75) shrink instead of overflowing. Base 26px.
 */
export const statValueCls = (value: string): string =>
  value.length > 16 ? 'text-[17px]' : value.length > 12 ? 'text-[21px]' : 'text-[26px]';

/** Same idea for the larger dashboard KPI values. Base 30px. */
export const kpiValueCls = (value: string): string =>
  value.length > 16 ? 'text-[19px]' : value.length > 12 ? 'text-[24px]' : 'text-[30px]';
