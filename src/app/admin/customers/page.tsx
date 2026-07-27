// src/app/admin/customers/page.tsx
import type { Metadata } from 'next';
import { Suspense } from 'react';
import CustomersClient from '@/components/admin/customers-client';

export const metadata: Metadata = { title: 'Customers' };

export default function AdminCustomersPage() {
  return (
    <Suspense>
      <CustomersClient />
    </Suspense>
  );
}
