// src/types/catalog-api.ts
// Request/response shapes for the catalogue APIs. Data payloads reuse the
// UI's existing Book/Order types (src/data/catalog).
import type { Book, Order, OrderStatus } from '@/data/catalog';

export interface IPaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TableQuery = Record<string, string | number | undefined>;

/* ── Books ── */
export interface IBooksResponse {
  message: string;
  data: Book[];
  meta: IPaginatedMeta;
}

export interface IBookOrderRef {
  id: string;
  name: string;
  date: string;
  qty: number;
  status: OrderStatus;
}

export interface IBookDetail extends Book {
  ordersWith: IBookOrderRef[];
}

export interface IBookDetailResponse {
  message: string;
  data: IBookDetail;
}

export interface IBookResponse {
  message: string;
  data: Book;
}

/* ── Orders ── */
export interface IOrderWithTotal extends Order {
  total: number;
}

export interface IOrdersResponse {
  message: string;
  data: IOrderWithTotal[];
  meta: IPaginatedMeta;
  statusCounts: Record<string, number>;
}

export interface IOrderLine {
  bookId: number;
  qty: number;
  unitPrice: number;
  title: string;
  author: string;
  genre: string;
  isbn: string;
}

export interface IOrderDetail extends IOrderWithTotal {
  lines: IOrderLine[];
}

export interface IOrderDetailResponse {
  message: string;
  data: IOrderDetail;
}

export interface ITrackedOrder {
  id: string;
  status: OrderStatus;
  date: string;
  total: number;
  items: { title: string; qty: number }[];
}

/* ── Customers ── */
export interface ICustomerSummary {
  name: string;
  email: string;
  phone: string;
  city: string;
  count: number;
  spent: number;
  last: string;
  hasAccount: boolean;
  userId?: string;
  since?: string;
}

export interface ICustomersResponse {
  message: string;
  data: ICustomerSummary[];
  meta: IPaginatedMeta;
  cities: string[];
}

export interface ICustomerDetail {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  hasAccount: boolean;
  userId?: string;
  since: string;
  favGenre: string;
  lastTitle: string;
  stats: { orders: number; spent: number; avgOrder: number; lastOrder: string };
  orders: (IOrderWithTotal & { summary: string })[];
  books: { id: number; title: string; genre: string }[];
}

/* ── Dashboard ── */
export interface ITrend {
  percentage: number;
  direction: 'upward' | 'downward' | 'neutral';
}

export interface IDashboardStats {
  kpis: {
    revenue: number;
    revenueTrend: ITrend;
    orders: number;
    ordersTrend: ITrend;
    avgOrder: number;
    avgOrderTrend: ITrend;
    unitsSold: number;
    newCustomers: number;
    newCustomersTrend: ITrend;
    totalCustomers: number;
    returningBuyers: number;
    cancelled: number;
  };
  weeks: { iso: string; w: string; v: number }[];
  topTitles: { title: string; sold: number; pct: number }[];
  catShare: { name: string; pct: number }[];
  funnel: { label: string; v: number }[];
  lowStock: { count: number; threshold: number; preview: { id: number; title: string; stock: number }[] };
  needsAttention: {
    outOfStock: number;
    lowStock: number;
    pendingOrders: number;
    awaitingShipment: number;
    pendingRefunds: number;
    draftBooks: number;
  };
  inventory: { titles: number; published: number; copies: number; value: number };
  statusCounts: Record<string, number>;
  latestOrders: IOrderWithTotal[];
}
