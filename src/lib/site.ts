// src/lib/site.ts
// Single source of brand/SEO truth - every metadata surface reads from here.

export const siteUrl = (
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export const siteConfig = {
  name: 'Harmattan Books',
  shortName: 'Harmattan',
  title: 'Harmattan Books - Independent booksellers in Tamale',
  description:
    'A small shop with strong opinions. We keep the classics in print, in stock, and in your hands - hand-picked editions, delivered anywhere in Ghana.',
  tagline: 'Independent booksellers · Tamale',
  locale: 'en_GH',
  email: 'hello@harmattanbooks.com',
  address: 'Aboabo Market Road',
  city: 'Tamale',
  country: 'Ghana',
  openingHours: 'Tue-Sun · 9am-7pm',
  themeColor: '#1c2a21',
  backgroundColor: '#f0f4ee',
  socials: {
    facebook: 'https://fb.com/harmattanbooks',
    twitter: 'https://x.com/harmattanbooks',
    instagram: 'https://instagram.com/harmattanbooks',
  },
  keywords: [
    'Harmattan Books',
    'bookshop Tamale',
    'bookstore Ghana',
    'classic literature Ghana',
    'buy books online Ghana',
    'independent bookshop',
    'Tamale bookshop',
    'Northern Region bookshop',
  ],
} as const;
