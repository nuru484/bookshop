import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // Baseline security headers applied to every response. These are
    // non-breaking; a full script-src/style-src CSP needs nonce wiring and
    // browser testing and is intentionally not set here. object-src/base-uri/
    // frame-ancestors are safe to enforce.
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
