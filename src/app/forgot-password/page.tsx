// src/app/forgot-password/page.tsx
import { Suspense } from 'react';
import ForgotPasswordForm from '@/components/ForgotPasswordForm';
import { pageMetadata } from '@/lib/seo';
import { siteConfig } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Forgot password',
  description: `Request a password reset link for the ${siteConfig.name} staff console.`,
  path: '/forgot-password',
  index: false,
});

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
