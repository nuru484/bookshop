// src/app/login/page.tsx
import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Staff sign in',
  description: 'Sign in to the Harmattan Books staff console.',
  path: '/login',
  index: false,
});

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
