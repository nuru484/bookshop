// src/app/(store)/checkout/verify/page.tsx
import { Suspense } from 'react';
import { pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';
import { CheckoutVerifyClient } from '@/components/store/checkout-verify-client';

export const metadata = pageMetadata({
  title: 'Confirming your payment',
  description: `Verifying your Paystack payment with ${siteConfig.name}.`,
  path: '/checkout/verify',
  index: false,
});

export default function CheckoutVerifyPage() {
  return (
    <Suspense>
      <CheckoutVerifyClient />
    </Suspense>
  );
}
