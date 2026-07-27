// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Karla } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { StoreProvider } from './StoreProvider';
import { siteConfig, siteUrl } from '@/lib/site';

const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: { canonical: '/' },
  formatDetection: { telephone: false },
  category: 'shopping',
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: '/',
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: siteConfig.themeColor,
  colorScheme: 'light',
};

const jsonLd = {
  bookstore: {
    '@context': 'https://schema.org',
    '@type': 'BookStore',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
    email: siteConfig.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.address,
      addressLocality: siteConfig.city,
      addressCountry: 'GH',
    },
    openingHours: 'Tu-Su 09:00-19:00',
    sameAs: Object.values(siteConfig.socials),
  },
  website: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${karla.variable} ${instrumentSerif.variable} flex min-h-screen flex-col antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.bookstore) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.website) }}
        />
        <StoreProvider>
          <Toaster />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
