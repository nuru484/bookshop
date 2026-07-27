// src/components/store/totals.ts
// Basket money math shared by the drawer and the checkout page. This is a
// display ESTIMATE - the server recomputes everything at payment time.
import { DELIVERY_FEE, FREE_DELIVERY_OVER, type Book, type OrderItem } from '@/data/catalog';
import type { AppliedPromo } from '@/redux/shop-slice';

/**
 * The applied promo as validated by /api/promos/validate. `genre` scopes
 * the discount to one shelf; the slice's persisted shape carries it along
 * even though its declared type doesn't know about it.
 */
export interface StorePromo extends AppliedPromo {
  genre?: string | null;
}

export interface CartTotals {
  sub: number;
  disc: number;
  fee: number;
  total: number;
}

export function cartTotals(cart: OrderItem[], books: Book[], promo: StorePromo | null): CartTotals {
  const sub = cart.reduce((sum, line) => {
    const book = books.find((b) => b.id === line.id);
    return sum + (book ? book.price * line.qty : 0);
  }, 0);

  let disc = 0;
  if (promo) {
    // Genre-scoped promos only discount lines from that shelf.
    const eligible = promo.genre
      ? cart.reduce((sum, line) => {
          const book = books.find((b) => b.id === line.id);
          return sum + (book && book.genre === promo.genre ? book.price * line.qty : 0);
        }, 0)
      : sub;
    disc = (eligible * promo.off) / 100;
  }

  const fee = sub - disc >= FREE_DELIVERY_OVER || sub === 0 ? 0 : DELIVERY_FEE;
  return { sub, disc, fee, total: Math.max(0, sub - disc + fee) };
}
