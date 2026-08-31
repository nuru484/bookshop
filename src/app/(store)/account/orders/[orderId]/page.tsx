// src/app/(store)/account/orders/[orderId]/page.tsx
import { pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';
import { AccountOrderDetailClient } from '@/components/store/account-order-detail-client';

export const metadata = pageMetadata({
  title: 'Order details',
  description: `The full details of one of your ${siteConfig.name} orders.`,
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
