// src/app/admin/customers/[email]/page.tsx
import type { Metadata } from 'next';
import CustomerDetailClient from '@/components/admin/customer-detail-client';

export const metadata: Metadata = { title: 'Customer detail' };

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email } = await params;
  return <CustomerDetailClient email={decodeURIComponent(email)} />;
}
