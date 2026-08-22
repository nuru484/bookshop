// src/lib/serializers.ts
// Maps DB rows to the exact shapes the UI speaks (the src/data/catalog
// types), so API data and seed data share one set of UI types.
import type { Book as DbBook, Order as DbOrder, OrderItem as DbOrderItem } from '@/lib/prisma';
import type { Book, Order } from '@/data/catalog';

export const serializeBook = (b: DbBook): Book => ({
  id: b.id,
  slug: b.slug,
  title: b.title,
  author: b.author,
  year: b.year,
  genre: b.genre,
  status: b.status,
  price: b.price,
  stock: b.stock,
  rating: b.rating,
  pages: b.pages,
  isbn: b.isbn,
  isNew: b.isNew,
  staffPick: b.staffPick,
  sold: b.sold,
  blurb: b.blurb,
});

export const serializeOrder = (o: DbOrder & { items: DbOrderItem[] }): Order => ({
  id: o.id,
  refundedAt: o.refundedAt ? o.refundedAt.toISOString() : null,
  refundRef: o.refundRef,
  refundAmount: o.refundAmount,
  name: o.name,
  email: o.email,
  phone: o.phone,
  city: o.city,
  address: o.address,
  status: o.status,
  date: o.createdAt.toISOString(),
  items: o.items.map((i) => ({ id: i.bookId, qty: i.qty })),
});
