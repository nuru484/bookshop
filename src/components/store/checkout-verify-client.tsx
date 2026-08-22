// src/components/store/checkout-verify-client.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { fmtCedis } from '@/lib/format';
import { useVerifyPaymentQuery } from '@/redux/catalog-api';
import { recordMyOrder } from '@/redux/shop-slice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { Skeleton } from '@/components/ui/Skeleton';

const shellCls = 'animate-fade-up mx-auto max-w-[560px] pt-[70px] pb-[90px] text-center';

const actionLink = (href: string, label: string, variant: 'primary' | 'outline' | 'quiet') => (
  <Link
    key={href}
    href={href}
    className={`${
      variant === 'primary' ? 'btn-primary' : variant === 'outline' ? 'btn-outline-ink' : 'btn-quiet'
    } inline-block px-6 py-[13px] text-sm no-underline hover:no-underline`}
  >
    {label}
  </Link>
);

export function CheckoutVerifyClient() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  // Paystack appends both `reference` and `trxref`; they hold the same value.
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? '';

  const cart = useAppSelector((s) => s.shop.cart);
  const customer = useAppSelector((s) => s.shop.customer);

  const { data, isLoading, isFetching, isError, refetch } = useVerifyPaymentQuery(reference, {
    skip: !reference,
  });
  const verifying = isLoading || isFetching;

  // On the first confirmed success: record the order locally (which also
  // clears the persisted basket + promo) - exactly once, guarded by the ref.
  const recordedRef = useRef(false);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);
  useEffect(() => {
    if (!data?.success || recordedRef.current) return;
    recordedRef.current = true;
    dispatch(
      recordMyOrder({
        id: data.data.orderId,
        date: new Date().toISOString(),
        status: data.data.status,
        items: cartRef.current.map((c) => ({ id: c.id, qty: c.qty })),
        total: data.data.total ?? 0,
      }),
    );
  }, [data, dispatch]);

  /* (a) No reference in the URL. */
  if (!reference) {
    return (
      <section className={shellCls}>
        <div className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center bg-parchment text-[28px] text-gold-deep">
          !
        </div>
        <h1 className="m-0 mb-2.5 font-serif text-[40px] font-normal">No payment to confirm</h1>
        <p className="m-0 mb-[22px] text-[15.5px] leading-[1.7] text-moss [text-wrap:pretty]">
          This page confirms Paystack payments, but no payment reference came with it. If you just
          paid, use the link from Paystack - or check your order below.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {actionLink('/track-order', 'Track an order', 'primary')}
          {actionLink('/shop', 'Back to the shop', 'outline')}
        </div>
      </section>
    );
  }

  /* (b) Verifying. */
  if (verifying) {
    return (
      <section aria-busy="true" className={shellCls}>
        <Skeleton className="mx-auto mb-[22px] h-16 w-16" />
        <h1 className="m-0 mb-2.5 font-serif text-[40px] font-normal">Confirming your payment…</h1>
        <p className="m-0 text-[15.5px] leading-[1.7] text-moss">
          One moment - we&apos;re checking with Paystack.
        </p>
        <div className="mx-auto mt-6 flex max-w-[320px] flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 self-center" />
        </div>
      </section>
    );
  }

  /* (c) Transport failure - reassure, offer retry. */
  if (isError || !data) {
    return (
      <section className={shellCls}>
        <div className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center bg-rust-pale text-[28px] font-bold text-rust">
          !
        </div>
        <h1 className="m-0 mb-2.5 font-serif text-[40px] font-normal">
          We couldn&apos;t confirm just now
        </h1>
        <p className="m-0 mb-[22px] text-[15.5px] leading-[1.7] text-moss [text-wrap:pretty]">
          The check didn&apos;t go through - but if you were charged, your order is still recorded
          on our side. Try again, or check Track order in a moment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => void refetch()} className="btn-dark px-6 py-[13px] text-sm">
            ↻ Try again
          </button>
          {actionLink('/track-order', 'Track order', 'outline')}
        </div>
      </section>
    );
  }

  /* (d) Verified: settled or not completed. */
  if (data.success) {
    const firstName = customer?.name.trim().split(' ')[0] ?? 'reader';
    return (
      <section className={shellCls}>
        <div className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center bg-pine text-[28px] text-cream">
          <Check className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="m-0 mb-2.5 font-serif text-[40px] font-normal">Thank you, {firstName}.</h1>
        <p className="m-0 mb-[22px] text-[15.5px] leading-[1.7] text-moss [text-wrap:pretty]">
          Your Paystack payment of <strong>{fmtCedis(data.data.total ?? 0)}</strong> went through.
          Order <strong>{data.data.orderId}</strong> is being wrapped in brown paper as we speak -
          a receipt is on its way to {customer?.email ?? 'your inbox'}.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {actionLink('/shop', 'Keep browsing', 'primary')}
          {actionLink('/account', 'View my orders', 'outline')}
          {actionLink('/track-order', 'Track order', 'quiet')}
        </div>
      </section>
    );
  }

  return (
    <section className={shellCls}>
      <div className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center bg-rust-pale text-[28px] font-bold text-rust">
        <X className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="m-0 mb-2.5 font-serif text-[40px] font-normal">Payment not completed</h1>
      <p className="m-0 mb-[22px] text-[15.5px] leading-[1.7] text-moss [text-wrap:pretty]">
        Paystack reports this payment didn&apos;t complete - nothing was charged and your basket is
        exactly as you left it. You can try again whenever you&apos;re ready.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {actionLink('/checkout', 'Try again', 'primary')}
        {actionLink('/shop', 'Back to the shop', 'outline')}
      </div>
    </section>
  );
}
