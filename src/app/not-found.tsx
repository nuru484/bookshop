// src/app/not-found.tsx
import type { Metadata } from 'next';
import { SystemMessage } from '@/components/ui/SystemMessage';

export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center">
      <SystemMessage
        code="404"
        title="This shelf is empty."
        description="The page you're after has been moved, sold out, or never existed. The shop, however, is very much open."
        actions={[
          { label: '← Back to home', href: '/', variant: 'dark' },
          { label: 'Browse the shop', href: '/shop', variant: 'outline' },
        ]}
      />
    </main>
  );
}
