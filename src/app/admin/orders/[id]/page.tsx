// src/app/admin/orders/[id]/page.tsx
import type { Metadata } from 'next';
import OrderDetailClient from '@/components/admin/order-detail-client';

export const metadata: Metadata = { title: 'Order detail' };

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailClient orderId={id} />;
}
