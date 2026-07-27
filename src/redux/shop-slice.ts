// src/redux/shop-slice.ts
// Storefront visitor state: basket, wishlist, recent searches and the mock
// customer account. Persisted to localStorage (same pattern as auth-slice);
// gate any UI that reads it behind useHydrated() to avoid SSR mismatches.
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CUSTOMER_SESSIONS, type DeviceSession, type OrderItem } from '@/data/catalog';

export interface CustomerProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface CustomerOrder {
  id: string;
  date: string;
  status: string;
  items: OrderItem[];
  total: number;
}

export interface AppliedPromo {
  code: string;
  off: number;
}

interface ShopState {
  cart: OrderItem[];
  wishlist: number[];
  recent: string[];
  promo: AppliedPromo | null;
  customer: CustomerProfile | null;
  myOrders: CustomerOrder[];
  tfa: boolean;
  sessions: DeviceSession[];
}

const EMPTY_STATE: ShopState = {
  cart: [],
  wishlist: [],
  recent: [],
  promo: null,
  customer: null,
  myOrders: [],
  tfa: false,
  sessions: CUSTOMER_SESSIONS,
};

const STORAGE_KEY = 'hb-shop';

const loadInitial = (): ShopState => {
  if (typeof window === 'undefined') return EMPTY_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<ShopState>) };
  } catch {
    return EMPTY_STATE;
  }
};

const persist = (state: ShopState): void => {
  if (typeof window === 'undefined') return;
  const { cart, wishlist, recent, promo, customer, myOrders, tfa } = state;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ cart, wishlist, recent, promo, customer, myOrders, tfa }),
  );
};

const shopSlice = createSlice({
  name: 'shop',
  initialState: loadInitial(),
  reducers: {
    /** Adds one copy; `max` is the book's current stock (clamped against). */
    addToCart: (state, action: PayloadAction<{ id: number; max: number }>) => {
      const { id, max } = action.payload;
      const line = state.cart.find((c) => c.id === id);
      if (line) {
        if (line.qty < max) line.qty += 1;
      } else if (max > 0) {
        state.cart.push({ id, qty: 1 });
      }
      persist(state);
    },
    changeQty: (state, action: PayloadAction<{ id: number; delta: number; max: number }>) => {
      const { id, delta, max } = action.payload;
      const line = state.cart.find((c) => c.id === id);
      if (!line) return;
      line.qty = Math.min(line.qty + delta, max);
      if (line.qty <= 0) state.cart = state.cart.filter((c) => c.id !== id);
      persist(state);
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.cart = state.cart.filter((c) => c.id !== action.payload);
      persist(state);
    },
    clearCart: (state) => {
      state.cart = [];
      state.promo = null;
      persist(state);
    },
    toggleWish: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      state.wishlist = state.wishlist.includes(id)
        ? state.wishlist.filter((w) => w !== id)
        : [...state.wishlist, id];
      persist(state);
    },
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const q = action.payload.trim();
      if (!q) return;
      state.recent = [q, ...state.recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      persist(state);
    },
    removeRecentSearch: (state, action: PayloadAction<string>) => {
      state.recent = state.recent.filter((r) => r.toLowerCase() !== action.payload.toLowerCase());
      persist(state);
    },
    clearRecentSearches: (state) => {
      state.recent = [];
      persist(state);
    },
    applyPromo: (state, action: PayloadAction<AppliedPromo>) => {
      state.promo = action.payload;
      persist(state);
    },
    clearPromo: (state) => {
      state.promo = null;
      persist(state);
    },
    customerSignedIn: (state, action: PayloadAction<CustomerProfile>) => {
      state.customer = action.payload;
      persist(state);
    },
    customerSignedOut: (state) => {
      state.customer = null;
      persist(state);
    },
    customerProfileSaved: (state, action: PayloadAction<CustomerProfile>) => {
      state.customer = action.payload;
      persist(state);
    },
    /** Records a placed order on the customer's own history. */
    recordMyOrder: (state, action: PayloadAction<CustomerOrder>) => {
      state.myOrders.unshift(action.payload);
      state.cart = [];
      state.promo = null;
      persist(state);
    },
    toggleCustomerTfa: (state) => {
      state.tfa = !state.tfa;
      persist(state);
    },
    revokeCustomerSession: (state, action: PayloadAction<number>) => {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
    },
  },
});

export const {
  addToCart,
  changeQty,
  removeFromCart,
  clearCart,
  toggleWish,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  applyPromo,
  clearPromo,
  customerSignedIn,
  customerSignedOut,
  customerProfileSaved,
  recordMyOrder,
  toggleCustomerTfa,
  revokeCustomerSession,
} = shopSlice.actions;

export default shopSlice.reducer;
