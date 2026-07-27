// src/components/store/order-status-steps.tsx
'use client';

import { Fragment } from 'react';
import type { OrderStatus } from '@/data/catalog';

const STEPS = ['Pending', 'Paid', 'Shipped', 'Delivered'] as const;

/**
 * Compact left-aligned fulfilment tracker shared by the public track-order
 * page and the customer order-detail page (mirrors the staff console's).
 */
export function OrderStatusSteps({ status }: { status: OrderStatus }) {
  if (status === 'Cancelled') {
    return (
      <p className="m-0 text-[13.5px] text-rust">
        This order was cancelled and refunded. If that&apos;s a surprise, write to us at
        hello@harmattanbooks.com.
      </p>
    );
  }

  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = i <= idx;
        return (
          <Fragment key={step}>
            {i > 0 && (
              <div
                className="mx-2 mt-2.5 h-0.5 min-w-3 flex-1"
                style={{ background: done ? '#2E6B4F' : '#DCE3D8' }}
                aria-hidden="true"
              />
            )}
            <div className="flex shrink-0 flex-col items-start gap-[7px]">
              <div
                className="box-border flex h-[22px] w-[22px] items-center justify-center border-2 text-[11px] font-bold"
                style={{
                  background: done ? '#2E6B4F' : '#F3F6F0',
                  borderColor: done ? '#2E6B4F' : '#DCE3D8',
                  color: done ? '#F1F6EF' : '#6A7A66',
                }}
              >
                {done ? '✓' : i + 1}
              </div>
              <div
                className="text-[11.5px] font-semibold"
                style={{ color: done ? '#1C2A21' : '#6A7A66' }}
              >
                {step}
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
