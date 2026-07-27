// src/app/admin/orders/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import OrdersClient from '@/components/admin/orders-client';

export const metadata: Metadata = { title: 'Orders' };

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersClient />
    </Suspense>
  );
}
