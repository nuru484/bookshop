// src/lib/site.ts
// Single source of brand/SEO truth - every metadata surface reads from here.
//
// Every value can be overridden with a NEXT_PUBLIC_ variable so the same
// codebase ships under a different shop name without a code change. The
// variable names are spelled out in full rather than looked up dynamically
// because Next only inlines NEXT_PUBLIC_ values it can see statically.

/** Trims a variable and falls back when it is unset or blank. */
function value(raw: string | undefined, whenUnset: string): string {
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : whenUnset;
}

/** "Harmattan Books" -> "harmattanbooks", used to build default handles. */
function handle(from: string): string {
  return from.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export const siteUrl = value(
  process.env.NEXT_PUBLIC_BASE_URL,
  'http://localhost:3000',
).replace(/\/$/, '');

const name = value(process.env.NEXT_PUBLIC_SITE_NAME, 'Harmattan Books');
const shortName = value(process.env.NEXT_PUBLIC_SITE_SHORT_NAME, name.split(' ')[0]);
const domain = value(process.env.NEXT_PUBLIC_SITE_DOMAIN, `${handle(name)}.com`);
const email = value(process.env.NEXT_PUBLIC_SITE_EMAIL, `hello@${domain}`);
const city = value(process.env.NEXT_PUBLIC_SITE_CITY, 'Tamale');
const region = value(process.env.NEXT_PUBLIC_SITE_REGION, 'Northern Region');
const country = value(process.env.NEXT_PUBLIC_SITE_COUNTRY, 'Ghana');
const countryCode = value(process.env.NEXT_PUBLIC_SITE_COUNTRY_CODE, 'GH');
const headline = value(
  process.env.NEXT_PUBLIC_SITE_HEADLINE,
  `Independent booksellers in ${city}`,
);

export const siteConfig = {
  name,
  shortName,
  domain,
  title: `${name} - ${headline}`,
  headline,
  description: value(
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
    `A small shop with strong opinions. We keep the classics in print, in stock, and in your hands - hand-picked editions, delivered anywhere in ${country}.`,
  ),
  /** The longer paragraph under the wordmark in the storefront footer. */
  blurb: value(
    process.env.NEXT_PUBLIC_SITE_BLURB,
    `An independent bookshop in ${city}, ${region}. Classics kept in print, opinions kept sharp, tea kept warm.`,
  ),
  tagline: value(
    process.env.NEXT_PUBLIC_SITE_TAGLINE,
    `Independent booksellers · ${city}`,
  ),
  locale: value(process.env.NEXT_PUBLIC_SITE_LOCALE, 'en_GH'),
  email,
  address: value(process.env.NEXT_PUBLIC_SITE_ADDRESS, 'Aboabo Market Road'),
  city,
  region,
  country,
  countryCode,
  openingHours: value(process.env.NEXT_PUBLIC_SITE_OPENING_HOURS, 'Tue-Sun · 9am-7pm'),
  /** schema.org openingHours format, kept alongside the human-readable one. */
  openingHoursSchema: value(
    process.env.NEXT_PUBLIC_SITE_OPENING_HOURS_SCHEMA,
    'Tu-Su 09:00-19:00',
  ),
  copyrightYear: value(process.env.NEXT_PUBLIC_SITE_COPYRIGHT_YEAR, '2026'),
  themeColor: value(process.env.NEXT_PUBLIC_SITE_THEME_COLOR, '#1c2a21'),
  backgroundColor: value(process.env.NEXT_PUBLIC_SITE_BACKGROUND_COLOR, '#f0f4ee'),
  socials: {
    facebook: value(
      process.env.NEXT_PUBLIC_SITE_FACEBOOK,
      `https://fb.com/${handle(name)}`,
    ),
    twitter: value(
      process.env.NEXT_PUBLIC_SITE_TWITTER,
      `https://x.com/${handle(name)}`,
    ),
    instagram: value(
      process.env.NEXT_PUBLIC_SITE_INSTAGRAM,
      `https://instagram.com/${handle(name)}`,
    ),
  },
  keywords: [
    name,
    `bookshop ${city}`,
    `bookstore ${country}`,
    `classic literature ${country}`,
    `buy books online ${country}`,
    'independent bookshop',
    `${city} bookshop`,
    `${region} bookshop`,
  ],
} as const;

/** "Ama Mensah" placeholder addresses and sample emails across the console. */
export const sampleEmail = (local: string): string => `${local}@${domain}`;

/** Postal address on one line, e.g. for the legal pages. */
export const postalAddress = [
  siteConfig.address,
  `${siteConfig.city}, ${siteConfig.region}`,
  siteConfig.country,
].join(', ');
