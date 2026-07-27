// src/app/(store)/account/page.tsx
import { pageMetadata } from '@/lib/seo';
import { AccountClient } from '@/components/store/account-client';

export const metadata = pageMetadata({
  title: 'My account',
  description: 'Sign in to see your orders and speed through checkout.',
  path: '/account',
  index: false,
});

export default function AccountPage() {
  return <AccountClient />;
}
