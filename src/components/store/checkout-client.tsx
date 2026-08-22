// src/components/store/checkout-client.tsx
'use client';

import { useState } from 'react';
import { fmtCedis } from '@/lib/format';
import { notify } from '@/lib/notify';
import { extractApiError } from '@/utils/extract-api-error';
import { useInitializePaymentMutation, useLazyValidatePromoQuery } from '@/redux/catalog-api';
import { useGetMeQuery } from '@/redux/user-api';
import { applyPromo, clearPromo, customerSignedIn } from '@/redux/shop-slice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldError, fieldA11y, fieldCls } from './field';
import { Skeleton } from '@/components/ui/Skeleton';
import { cartTotals, type StorePromo } from './totals';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

type CkField = 'name' | 'email' | 'phone' | 'address' | 'city';
type CkForm = Record<CkField, string>;
type CkErrors = Partial<Record<CkField, string>>;

const BLANK: CkForm = { name: '', email: '', phone: '', address: '', city: '' };

const FIELD_INPUT = 'input-glass px-[15px] py-[13px] text-[15px] font-normal w-full box-border';

export function CheckoutClient() {
  const dispatch = useAppDispatch();
  const hydrated = useHydrated();

  const books = useAppSelector((s) => s.catalog.books);
  const cart = useAppSelector((s) => s.shop.cart);
  const promo = useAppSelector((s) => s.shop.promo) as StorePromo | null;
  const customer = useAppSelector((s) => s.shop.customer);

  const [initializePayment, { isLoading: starting }] = useInitializePaymentMutation();
  const [validatePromo, { isLoading: validatingPromo }] = useLazyValidatePromoQuery();

  // Signed-in customers speed through checkout: the saved profile (with the
  // real address/city on the account) prefills the delivery form.
  const { data: meData } = useGetMeQuery(undefined, { skip: !hydrated || !customer });
  const me = meData?.data;

  const [ck, setCk] = useState<CkForm>(BLANK);
  const [ckErrs, setCkErrs] = useState<CkErrors>({});
  const [promoIn, setPromoIn] = useState('');
  const [prefilled, setPrefilled] = useState<string | null>(null);

  // Prefill once per source; the server profile wins over the local copy
  // when it arrives (adjust-state-during-render pattern).
  const prefillSource = me ? `me:${me.id}:${String(me.updatedAt)}` : customer ? 'local' : null;
  if (hydrated && prefillSource && prefillSource !== prefilled) {
    setPrefilled(prefillSource);
    setCk((prev) => ({
      name: prev.name || me?.fullname || customer?.name || '',
      email: prev.email || me?.email || customer?.email || '',
      phone: prev.phone || me?.phone || customer?.phone || '',
      address: prev.address || me?.address || customer?.address || '',
      city: prev.city || me?.city || '',
    }));
  }

  const onField = (field: CkField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCk((prev) => ({ ...prev, [field]: e.target.value }));
    setCkErrs((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const lines = cart
    .map((line) => ({ line, book: books.find((b) => b.id === line.id) }))
    .filter((x) => x.book);
  const totals = cartTotals(cart, books, promo);

  // Promo codes are DB records, so the checkout validates against the API for
  // an honest estimate; the server re-applies the promo itself at payment time.
  const onApplyPromo = async () => {
    const code = promoIn.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await validatePromo(code).unwrap();
      const applied: StorePromo = {
        code: res.data.code,
        off: res.data.percentOff,
        genre: res.data.genre,
      };
      dispatch(applyPromo(applied));
      notify(
        res.data.genre
          ? `${res.data.percentOff}% off ${res.data.genre} titles applied.`
          : `${res.data.percentOff}% off applied.`,
      );
    } catch (err) {
      dispatch(clearPromo());
      notify(extractApiError(err).message);
    }
  };

  const onPlaceOrder = async () => {
    const errs: CkErrors = {};
    if (ck.name.trim().length < 2) errs.name = 'Please tell us your full name.';
    if (!EMAIL_RE.test(ck.email.trim())) errs.email = "That email doesn't look right.";
    if (ck.phone.replace(/\D/g, '').length < 9) errs.phone = 'Enter a valid phone number.';
    if (ck.address.trim().length < 5) errs.address = 'We need a full delivery address.';
    if (ck.city.trim().length < 2) errs.city = 'Which city or town?';
    if (Object.keys(errs).length) {
      setCkErrs(errs);
      notify('A few details need attention.');
      return;
    }
    if (!cart.length) {
      notify('Your basket is empty.');
      return;
    }

    try {
      const res = await initializePayment({
        name: ck.name.trim(),
        email: ck.email.trim(),
        phone: ck.phone.trim(),
        address: ck.address.trim(),
        city: ck.city.trim(),
        items: cart.map((c) => ({ id: c.id, qty: c.qty })),
        promoCode: promo?.code,
      }).unwrap();

      // Keep a local identity for guests so the account page knows them
      // when they come back from Paystack. The basket stays intact until
      // the payment actually settles (verified on /checkout/verify).
      if (!customer) {
        dispatch(
          customerSignedIn({
            name: ck.name.trim(),
            email: ck.email.trim(),
            phone: ck.phone.trim(),
            address: ck.address.trim(),
          }),
        );
      }

      // Full redirect to Paystack's hosted checkout: the secret stays
      // server-side, no public key in the client.
      window.location.href = res.data.authorizationUrl;
    } catch (err) {
      // Stock may have moved since the page loaded - surface the server's
      // user-ready message ("X has just sold out.", etc).
      notify(extractApiError(err).message);
    }
  };

  if (!hydrated) {
    return (
      <section aria-busy="true" className="pt-10 pb-16">
        <Skeleton className="mb-[26px] h-10 w-56" />
        <div className="flex flex-wrap gap-9">
          <div className="min-w-[290px] flex-[1_1_400px]">
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="mb-4 h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <Skeleton className="h-72 min-w-[290px] flex-[1_1_320px]" />
        </div>
      </section>
    );
  }

  if (cart.length === 0) {
    return (
      <section className="animate-fade-up mx-auto max-w-[640px] pt-16 pb-16">
        <EmptyState
          title="Your basket is empty"
          description="Every great library starts with one book."
          action={{ label: 'Browse the shop', href: '/shop', variant: 'primary' }}
        />
      </section>
    );
  }

  return (
    <section className="animate-fade-up pt-10 pb-16">
      <h1 className="m-0 mb-[26px] font-serif text-[40px] font-normal">Checkout</h1>
      <div className="flex flex-wrap items-start gap-9">
        {/* Delivery details */}
        <div className="flex min-w-[290px] flex-[1_1_400px] flex-col gap-4">
          <div className="text-xs font-bold tracking-[0.2em] text-sage uppercase">Delivery details</div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ck-name" className="text-[13px] font-bold">
              Full name
            </label>
            <input
              id="ck-name"
              value={ck.name}
              onChange={onField('name')}
              placeholder="Ama Mensah"
              className={fieldCls(FIELD_INPUT, !!ckErrs.name)}
              {...fieldA11y('ck-name', ckErrs.name)}
            />
            <FieldError id="ck-name" message={ckErrs.name} />
          </div>

          <div className="flex flex-wrap gap-3.5">
            <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5">
              <label htmlFor="ck-email" className="text-[13px] font-bold">
                Email
              </label>
              <input
                id="ck-email"
                type="email"
                value={ck.email}
                onChange={onField('email')}
                placeholder="you@email.com"
                className={fieldCls(FIELD_INPUT, !!ckErrs.email)}
                {...fieldA11y('ck-email', ckErrs.email)}
              />
              <FieldError id="ck-email" message={ckErrs.email} />
            </div>
            <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1.5">
              <label htmlFor="ck-phone" className="text-[13px] font-bold">
                Phone
              </label>
              <input
                id="ck-phone"
                value={ck.phone}
                onChange={onField('phone')}
                placeholder="024 555 0182"
                className={fieldCls(FIELD_INPUT, !!ckErrs.phone)}
                {...fieldA11y('ck-phone', ckErrs.phone)}
              />
              <FieldError id="ck-phone" message={ckErrs.phone} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ck-address" className="text-[13px] font-bold">
              Delivery address
            </label>
            <input
              id="ck-address"
              value={ck.address}
              onChange={onField('address')}
              placeholder="Aboabo Market Road"
              className={fieldCls(FIELD_INPUT, !!ckErrs.address)}
              {...fieldA11y('ck-address', ckErrs.address)}
            />
            <FieldError id="ck-address" message={ckErrs.address} />
          </div>

          <div className="flex max-w-[280px] flex-col gap-1.5">
            <label htmlFor="ck-city" className="text-[13px] font-bold">
              City / town
            </label>
            <input
              id="ck-city"
              value={ck.city}
              onChange={onField('city')}
              placeholder="Tamale"
              className={fieldCls(FIELD_INPUT, !!ckErrs.city)}
              {...fieldA11y('ck-city', ckErrs.city)}
            />
            <FieldError id="ck-city" message={ckErrs.city} />
          </div>
        </div>

        {/* Order summary */}
        <div className="glass min-w-[290px] flex-[1_1_320px] p-6">
          <div className="mb-4 text-xs font-bold tracking-[0.2em] text-sage uppercase">Your order</div>
          <div className="mb-4 flex flex-col gap-3">
            {lines.map(({ line, book }) => (
              <div key={line.id} className="flex justify-between gap-3 text-sm">
                <span className="text-moss">
                  {book!.title} × {line.qty}
                </span>
                <span className="font-bold">{fmtCedis(book!.price * line.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mb-4 flex gap-2">
            <input
              value={promoIn}
              onChange={(e) => setPromoIn(e.target.value)}
              placeholder="Promo code"
              className="input-glass min-w-0 flex-1 px-3 py-2.5 text-[13px] font-semibold tracking-[0.04em] uppercase"
            />
            <button
              type="button"
              onClick={() => void onApplyPromo()}
              disabled={validatingPromo}
              className="btn-dark px-4 py-2.5 text-[13px] disabled:opacity-60"
            >
              {validatingPromo ? 'Checking…' : 'Apply'}
            </button>
          </div>
          <div className="flex flex-col gap-2 border-t border-mist pt-3.5 text-sm text-moss">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{fmtCedis(totals.sub)}</span>
            </div>
            <div className="flex justify-between text-pine">
              <span>{promo ? `${promo.code} applied` : 'Discount'}</span>
              <span>{totals.disc > 0 ? `−${fmtCedis(totals.disc)}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{totals.fee === 0 ? 'Free' : fmtCedis(totals.fee)}</span>
            </div>
            <div className="flex justify-between pt-1.5 text-lg font-bold text-ink">
              <span>Total</span>
              <span>{fmtCedis(totals.total)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onPlaceOrder()}
            disabled={starting}
            className="mt-[18px] w-full cursor-pointer border-none bg-linear-135 from-[#09A5DB] to-[#0B6FB8] px-5 py-4 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(9,110,184,0.3)] transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {starting ? 'Starting payment…' : `Pay ${fmtCedis(totals.total)} with Paystack`}
          </button>
          <div className="mt-2.5 text-center text-[11.5px] text-sage">
            Secured by Paystack · Cards, MoMo &amp; bank transfer
          </div>
        </div>
      </div>
    </section>
  );
}
