// src/components/store/use-shop-actions.ts
'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { addToCart } from '@/redux/shop-slice';
import { notify } from '@/lib/notify';
import { useCartUi } from './cart-ui';
import { useWishlist } from './use-wishlist';

/**
 * The storefront's two universal actions - add to basket (stock-aware,
 * opens the drawer) and toggle wishlist (DB-backed for signed-in
 * customers, localStorage for guests) - with the design's toast copy.
 */
export function useShopActions() {
  const dispatch = useAppDispatch();
  const books = useAppSelector((s) => s.catalog.books);
  const cart = useAppSelector((s) => s.shop.cart);
  const { wishlist, toggle } = useWishlist();
  const { openCart } = useCartUi();

  const addBook = useCallback(
    (id: number) => {
      const book = books.find((b) => b.id === id);
      if (!book || book.stock === 0) {
        notify('Sorry - that one is out of stock.');
        return;
      }
      const line = cart.find((c) => c.id === id);
      if (line && line.qty >= book.stock) {
        notify("That's all the copies we have.");
        return;
      }
      dispatch(addToCart({ id, max: book.stock }));
      openCart();
    },
    [books, cart, dispatch, openCart],
  );

  return { addBook, toggleWishlist: toggle, wishlist };
}
