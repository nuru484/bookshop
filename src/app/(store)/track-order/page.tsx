// src/app/(store)/track-order/page.tsx
import { pageMetadata } from '@/lib/seo';
import { TrackOrderClient } from '@/components/store/track-order-client';

export const metadata = pageMetadata({
  title: 'Track your order',
  description: 'Check the status of a Harmattan Books order with your order ID and contact details.',
  path: '/track-order',
  index: false,
});

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
