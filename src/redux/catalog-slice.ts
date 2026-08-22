// src/redux/catalog-slice.ts
// In-memory catalogue seeded from the static data. Both the storefront and
// the admin console read from here, so admin mutations (restock, delete,
// order status changes) are reflected everywhere.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  BOOKS,
  ORDERS,
  PROMOS,
  STAFF,
  slugify,
  type Book,
  type Order,
  type OrderStatus,
  type Promo,
  type StaffMember,
} from '@/data/catalog';

interface CatalogState {
  books: Book[];
  orders: Order[];
  promos: Promo[];
  staff: StaffMember[];
}

const initialState: CatalogState = {
  books: BOOKS,
  orders: ORDERS,
  promos: PROMOS,
  staff: STAFF,
};

const ORDER_FLOW: OrderStatus[] = ['Pending', 'Paid', 'Shipped', 'Delivered'];

export interface BookInput {
  id?: number;
  title: string;
  author: string;
  price: number;
  stock: number;
  genre: Book['genre'];
  year?: number;
  isbn?: string;
  blurb?: string;
}

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    /**
     * Hydrates the client working set from the server-fetched (cached,
     * tag-revalidated) catalogue - the storefront's source of truth.
     */
    setBooks: (state, action: PayloadAction<Book[]>) => {
      state.books = action.payload;
    },
    upsertBook: (state, action: PayloadAction<BookInput>) => {
      const input = action.payload;
      if (input.id) {
        const book = state.books.find((b) => b.id === input.id);
        if (book) {
          book.title = input.title;
          book.author = input.author;
          book.price = input.price;
          book.stock = input.stock;
          book.genre = input.genre;
          if (input.year) book.year = input.year;
          if (input.isbn) book.isbn = input.isbn;
          book.blurb = input.blurb ?? book.blurb;
          book.slug = slugify(input.title);
        }
      } else {
        const id = Math.max(...state.books.map((b) => b.id), 0) + 1;
        state.books.push({
          id,
          slug: slugify(input.title),
          title: input.title,
          author: input.author,
          price: input.price,
          stock: input.stock,
          genre: input.genre,
          year: input.year ?? 2026,
          isbn: input.isbn ?? '',
          blurb: input.blurb ?? '',
          rating: 0,
          pages: 0,
          sold: 0,
          isNew: true,
        });
      }
    },
    deleteBooks: (state, action: PayloadAction<number[]>) => {
      state.books = state.books.filter((b) => !action.payload.includes(b.id));
    },
    restockBook: (state, action: PayloadAction<{ id: number; qty?: number }>) => {
      const book = state.books.find((b) => b.id === action.payload.id);
      if (book) book.stock += action.payload.qty ?? 20;
    },
    advanceOrder: (state, action: PayloadAction<string>) => {
      const order = state.orders.find((o) => o.id === action.payload);
      if (!order || order.status === 'Cancelled') return;
      const idx = ORDER_FLOW.indexOf(order.status);
      if (idx >= 0 && idx < ORDER_FLOW.length - 1) order.status = ORDER_FLOW[idx + 1];
    },
    cancelOrder: (state, action: PayloadAction<string>) => {
      const order = state.orders.find((o) => o.id === action.payload);
      if (order && order.status !== 'Cancelled') order.status = 'Cancelled';
    },
    /** Checkout pushes the new order here so the admin console sees it too. */
    placeOrder: (state, action: PayloadAction<Order>) => {
      state.orders.unshift(action.payload);
      // Decrement stock for each purchased line.
      action.payload.items.forEach((item) => {
        const book = state.books.find((b) => b.id === item.id);
        if (book) book.stock = Math.max(0, book.stock - item.qty);
      });
    },
    addPromo: (state, action: PayloadAction<Promo>) => {
      state.promos.unshift(action.payload);
    },
    togglePromo: (state, action: PayloadAction<string>) => {
      const promo = state.promos.find((p) => p.code === action.payload);
      if (promo) promo.active = !promo.active;
    },
    addStaff: (state, action: PayloadAction<StaffMember>) => {
      state.staff.push(action.payload);
    },
    toggleStaff: (state, action: PayloadAction<string>) => {
      const member = state.staff.find((m) => m.email === action.payload);
      if (member && !member.you) member.active = !member.active;
    },
  },
});

export const {
  setBooks,
  upsertBook,
  deleteBooks,
  restockBook,
  advanceOrder,
  cancelOrder,
  placeOrder,
  addPromo,
  togglePromo,
  addStaff,
  toggleStaff,
} = catalogSlice.actions;

export default catalogSlice.reducer;
