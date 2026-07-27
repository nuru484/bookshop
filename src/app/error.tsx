// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { SystemMessage } from '@/components/ui/SystemMessage';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center">
      <SystemMessage
        glyph="!"
        title="Something fell off the shelf."
        description="An unexpected error interrupted the page. It's usually temporary - try again, or head back to the shop."
        actions={[
          { label: '↻ Try again', onClick: () => reset(), variant: 'dark' },
          { label: 'Back to home', href: '/', variant: 'outline' },
        ]}
      />
    </main>
  );
}
