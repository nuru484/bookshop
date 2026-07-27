// src/app/(store)/checkout/page.tsx
import { pageMetadata } from '@/lib/seo';
import { CheckoutClient } from '@/components/store/checkout-client';

export const metadata = pageMetadata({
  title: 'Checkout',
  description: 'Delivery details and secure Paystack payment.',
  path: '/checkout',
  index: false,
});

export default function CheckoutPage() {
  return <CheckoutClient />;
}
