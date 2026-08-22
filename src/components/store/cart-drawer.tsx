// src/components/store/cart-drawer.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { FREE_DELIVERY_OVER } from '@/data/catalog';
import { fmtCedis } from '@/lib/format';
import { notify } from '@/lib/notify';
import { changeQty, removeFromCart } from '@/redux/shop-slice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { BookCover } from '@/components/ui/BookCover';
import { cartTotals } from './totals';
import { useCartUi } from './cart-ui';

/**
 * The basket: a bottom sheet that slides up over the page (all screens),
 * full-width on phones and centered at 560px from sm up.
 */
export function CartDrawer() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { open, closeCart } = useCartUi();
  const books = useAppSelector((s) => s.catalog.books);
  const cart = useAppSelector((s) => s.shop.cart);
  const promo = useAppSelector((s) => s.shop.promo);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeCart]);

  if (!open) return null;

  const lines = cart.map((line) => ({
    line,
    book: books.find((b) => b.id === line.id),
  }));
  const totals = cartTotals(cart, books, promo);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const goCheckout = () => {
    if (!cart.length) {
      notify('Your basket is empty.');
      return;
    }
    closeCart();
    router.push('/checkout');
  };

  return (
    <>
      <div
        onClick={closeCart}
        aria-hidden="true"
        className="fixed inset-0 z-60 bg-[rgba(18,30,23,0.45)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
        className="animate-in slide-in-from-bottom fixed inset-x-0 bottom-0 z-61 mx-auto flex max-h-[88dvh] w-full flex-col bg-[rgba(243,246,240,0.94)] pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_50px_rgba(18,30,23,0.3)] backdrop-blur-[36px] backdrop-saturate-[170%] duration-300 sm:max-w-[560px]"
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5" aria-hidden="true">
          <span className="h-1 w-10 bg-ink/20" />
        </div>

        <div className="flex items-center justify-between border-b border-mist px-6 pt-2 pb-4">
          <div className="font-serif text-2xl text-ink">
            Your basket <span className="font-sans text-sm font-semibold text-sage">({cartCount})</span>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close basket"
            className="cursor-pointer border-none bg-transparent p-1 text-[22px] text-sage hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-[18px]">
          {lines.map(({ line, book }) =>
            book ? (
              <div key={line.id} className="flex items-start gap-3.5">
                <BookCover book={book} size="M" fallback="tiny" showAuthor={false} className="w-14 flex-none" />
                <div className="min-w-0 flex-1">
                  <div className="font-serif text-[15.5px] leading-tight text-ink">{book.title}</div>
                  <div className="mt-0.5 mb-2 text-xs font-medium text-sage">{book.author}</div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center overflow-hidden border-[1.5px] border-mist">
                      <button
                        type="button"
                        aria-label={`Remove one ${book.title}`}
                        onClick={() => dispatch(changeQty({ id: line.id, delta: -1, max: book.stock }))}
                        className="h-7 w-7 cursor-pointer border-none bg-transparent text-[15px] font-bold text-ink hover:bg-pale"
                      >
                        −
                      </button>
                      <span className="min-w-[22px] text-center text-[13px] font-bold text-ink">{line.qty}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${book.title}`}
                        onClick={() => {
                          if (line.qty >= book.stock) {
                            notify("That's all the copies we have.");
                            return;
                          }
                          dispatch(changeQty({ id: line.id, delta: 1, max: book.stock }));
                        }}
                        className="h-7 w-7 cursor-pointer border-none bg-transparent text-[15px] font-bold text-ink hover:bg-pale"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch(removeFromCart(line.id))}
                      className="cursor-pointer border-none bg-transparent p-0 text-xs font-semibold text-sage hover:text-pine"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="text-sm font-bold whitespace-nowrap text-ink">
                  {fmtCedis(book.price * line.qty)}
                </div>
              </div>
            ) : null,
          )}

          {cart.length === 0 && (
            <div className="px-2.5 py-10 text-center">
              <div className="mb-1.5 font-serif text-[22px] text-ink">Your basket is empty</div>
              <p className="m-0 mb-4 text-[13.5px] text-sage">Every great library starts with one book.</p>
              <Link
                href="/shop"
                onClick={closeCart}
                className="btn-primary inline-block px-[22px] py-3 text-sm no-underline hover:no-underline"
              >
                Browse the shop
              </Link>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-ink/14 bg-white/50 px-6 py-[18px]">
            <div className="mb-1 flex justify-between text-sm text-moss">
              <span>Subtotal</span>
              <span className="font-bold text-ink">{fmtCedis(totals.sub)}</span>
            </div>
            <div className="mb-3.5 text-xs text-sage">
              {totals.sub >= FREE_DELIVERY_OVER
                ? "You've earned free delivery in Tamale."
                : `Add ${fmtCedis(FREE_DELIVERY_OVER - totals.sub)} more for free delivery in Tamale.`}
            </div>
            <button type="button" onClick={goCheckout} className="btn-dark w-full px-5 py-[15px] text-[15px]">
              Checkout · {fmtCedis(totals.sub)}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
