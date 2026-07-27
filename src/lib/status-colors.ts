// src/lib/status-colors.ts
// Single source of truth for status pill colors, mirroring the design's PILL map.
import type { OrderStatus } from '@/data/catalog';
import { LOW_STOCK_THRESHOLD } from '@/data/catalog';

export interface PillColors {
  bg: string;
  fg: string;
}

const ORDER_PILLS: Record<OrderStatus, PillColors> = {
  Paid: { bg: '#E4EBDF', fg: '#3E5A41' },
  Pending: { bg: '#F3E7CE', fg: '#8A6414' },
  Shipped: { bg: '#DFE7EE', fg: '#34506B' },
  Delivered: { bg: '#E4EBDF', fg: '#3E5A41' },
  Cancelled: { bg: '#F0DEDA', fg: '#93381A' },
};

export const orderPill = (status: OrderStatus | string): PillColors =>
  ORDER_PILLS[status as OrderStatus] ?? ORDER_PILLS.Paid;

export interface StockPill extends PillColors {
  label: string;
}

/** "Out of stock" / "4 left" / "24 in stock" pill, as in the admin design. */
export const stockPill = (stock: number, threshold = LOW_STOCK_THRESHOLD): StockPill => {
  if (stock === 0) return { label: 'Out of stock', bg: '#F0DEDA', fg: '#93381A' };
  if (stock <= threshold) return { label: `${stock} left`, bg: '#F3E7CE', fg: '#8A6414' };
  return { label: `${stock} in stock`, bg: '#E4EBDF', fg: '#3E5A41' };
};

/** Storefront card badge: "Out of stock" / "Only 4 left" / "New" / "". */
export const cardBadge = (book: { stock: number; isNew?: boolean }): string => {
  if (book.stock === 0) return 'Out of stock';
  if (book.stock <= 5) return `Only ${book.stock} left`;
  if (book.isNew) return 'New';
  return '';
};
