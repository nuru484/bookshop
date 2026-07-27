// src/components/store/cart-ui.tsx
'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface CartUiValue {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartUiContext = createContext<CartUiValue | null>(null);

/** Drawer open/close state, mounted once in the (store) layout. */
export function CartUiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openCart, closeCart }), [open, openCart, closeCart]);
  return <CartUiContext.Provider value={value}>{children}</CartUiContext.Provider>;
}

export function useCartUi(): CartUiValue {
  const ctx = useContext(CartUiContext);
  if (!ctx) throw new Error('useCartUi must be used inside CartUiProvider');
  return ctx;
}
