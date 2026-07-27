// src/app/reset-password/page.tsx
import { Suspense } from 'react';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Reset password',
  description: 'Choose a new password for your Harmattan Books staff account.',
  path: '/reset-password',
  index: false,
});

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
