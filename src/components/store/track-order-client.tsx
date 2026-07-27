// src/components/store/track-order-client.tsx
'use client';

import { useState } from 'react';
import { fmtCedis, fmtDate, fmtTime } from '@/lib/format';
import { extractApiError } from '@/utils/extract-api-error';
import { useTrackOrderMutation } from '@/redux/catalog-api';
import { StatusPill } from '@/components/ui/StatusPill';
import { OrderStatusSteps } from './order-status-steps';
import { FieldError, FormError, fieldA11y, fieldCls } from './field';
import type { ITrackedOrder } from '@/types/catalog-api';

const FIELD_INPUT = 'input-glass px-[15px] py-[13px] text-[15px] font-normal w-full box-border';

export function TrackOrderClient() {
  const [trackOrder, { isLoading: tracking }] = useTrackOrderMutation();

  const [orderId, setOrderId] = useState('');
  const [contact, setContact] = useState('');
  const [result, setResult] = useState<ITrackedOrder | null>(null);
  const [errs, setErrs] = useState<{ orderId?: string; contact?: string; form?: string }>({});

  const lookup = async () => {
    const id = orderId.trim().toUpperCase();
    const who = contact.trim();

    const fieldErrs: { orderId?: string; contact?: string } = {};
    if (!id) fieldErrs.orderId = 'Enter your order ID (it looks like HB-2431).';
    else if (!/^HB-\d{3,}$/i.test(id)) fieldErrs.orderId = 'Order IDs look like HB-2431.';
    if (!who) fieldErrs.contact = 'Enter the email or phone used on the order.';
    if (Object.keys(fieldErrs).length) {
      setResult(null);
      setErrs(fieldErrs);
      return;
    }

    try {
      const res = await trackOrder({ orderId: id, contact: who }).unwrap();
      setErrs({});
      setResult(res.data);
    } catch (apiErr) {
      setResult(null);
      // The API answers with the same message whether the id or the contact
      // is wrong, so an order ID alone never exposes someone else's order -
      // which also means it belongs at form level, not on one field.
      setErrs({ form: extractApiError(apiErr).message });
    }
  };

  return (
    <section className="animate-fade-up mx-auto w-full max-w-[640px] pt-10 pb-16">
      <h1 className="m-0 mb-1.5 font-serif text-[36px] font-normal">Track your order</h1>
      <p className="m-0 mb-6 text-sm text-sage">
        Enter your order ID and the email or phone number you used at checkout.
      </p>

      <div className="glass-from-sm mb-5 px-1 py-6 sm:px-7">
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="to-id" className="text-[13px] font-bold">
              Order ID
            </label>
            <input
              id="to-id"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setErrs({});
              }}
              placeholder="HB-2431"
              autoFocus
              className={fieldCls(FIELD_INPUT, !!errs.orderId)}
              {...fieldA11y('to-id', errs.orderId)}
            />
            <FieldError id="to-id" message={errs.orderId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="to-contact" className="text-[13px] font-bold">
              Email or phone used on the order
            </label>
            <input
              id="to-contact"
              value={contact}
              onChange={(e) => {
                setContact(e.target.value);
                setErrs({});
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void lookup();
              }}
              placeholder="you@email.com or 024 555 0182"
              className={fieldCls(FIELD_INPUT, !!errs.contact)}
              {...fieldA11y('to-contact', errs.contact)}
            />
            <FieldError id="to-contact" message={errs.contact} />
          </div>
          <FormError message={errs.form} />
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={tracking}
            className="btn-dark px-5 py-3.5 text-[15px]"
          >
            {tracking ? 'Looking it up…' : 'Track order'}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass animate-fade-up px-5 py-6 sm:px-7">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="font-serif text-[24px]">Order {result.id}</div>
            <StatusPill status={result.status} className="px-3 py-[5px] text-[11.5px]" />
            <span className="text-[13px] font-medium text-sage">
              Placed {fmtDate(result.date)}
              {fmtTime(result.date) && `, ${fmtTime(result.date)}`}
            </span>
          </div>

          <div className="mb-5">
            <OrderStatusSteps status={result.status} />
          </div>

          <div className="border-t border-mist pt-4">
            <div className="mb-1.5 text-xs font-bold tracking-[0.16em] text-sage uppercase">
              In the parcel
            </div>
            <p className="m-0 mb-2 text-[13.5px] leading-[1.6] text-moss">
              {result.items
                .map((item) => `${item.title}${item.qty > 1 ? ` ×${item.qty}` : ''}`)
                .join(', ')}
            </p>
            <div className="flex items-baseline justify-between text-[15px] font-bold text-ink">
              <span>Total</span>
              <span>{fmtCedis(result.total)}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
