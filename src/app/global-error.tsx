// src/app/global-error.tsx
'use client';

import { useEffect } from 'react';
import { siteConfig } from '@/lib/site';

// Replaces the root layout when it crashes, so it renders its own
// <html>/<body> with inline styles only (globals.css is unavailable).
export default function GlobalError({
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
    <html lang="en">
      <head>
        <title>{`Something went wrong · ${siteConfig.name}`}</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#F0F4EE',
          color: '#1C2A21',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 22px',
              background: '#1C2A21',
              color: '#F3F6F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
            }}
          >
            !
          </div>
          <h1 style={{ fontWeight: 400, fontSize: 40, margin: '0 0 10px' }}>
            Something went wrong.
          </h1>
          <p
            style={{
              fontFamily: 'Arial, sans-serif',
              fontSize: 15,
              lineHeight: 1.7,
              color: '#45543F',
              margin: '0 0 24px',
            }}
          >
            The whole page failed to load. Try again - if it keeps happening,
            we would genuinely like to know.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#1C2A21',
              color: '#F3F6F0',
              border: 'none',
              padding: '14px 26px',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ↻ Try again
          </button>
        </div>
      </body>
    </html>
  );
}
