// src/app/(store)/account/orders/[orderId]/page.tsx
import { pageMetadata } from '@/lib/seo';
import { AccountOrderDetailClient } from '@/components/store/account-order-detail-client';

export const metadata = pageMetadata({
  title: 'Order details',
  description: 'The full details of one of your Harmattan Books orders.',
  path: '/account',
  index: false,
});

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <AccountOrderDetailClient orderId={orderId} />;
}
