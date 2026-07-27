// src/lib/seo.ts
import type { Metadata } from 'next';
import { siteConfig, siteUrl } from './site';

const MAX_TITLE = 60;
const MAX_DESCRIPTION = 125;

interface PageMetaInput {
  title: string;
  description: string;
  /** Absolute path, e.g. "/shop" - used for the canonical + OG url. */
  path: string;
  keywords?: string[];
  /** Set false for transactional/no-value pages (e.g. the checkout). */
  index?: boolean;
  /** Page-specific OG/Twitter image (absolute URL). */
  image?: string;
}

/** Clamp a string on a word boundary. */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : max - 1).trimEnd()}…`;
}

/**
 * Builds the full Metadata object for a page. Titles are clamped including
 * the " · Harmattan Books" suffix; descriptions are clamped on a word
 * boundary. When no image is passed, OG/Twitter images are omitted so the
 * file-convention opengraph-image (if present) merges in.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  index = true,
  image,
}: PageMetaInput): Metadata {
  const suffix = ` · ${siteConfig.name}`;
  const fullTitle =
    title.length + suffix.length <= MAX_TITLE
      ? `${title}${suffix}`
      : clamp(title, MAX_TITLE - suffix.length) + suffix;
  const desc = clamp(description, MAX_DESCRIPTION);
  const url = `${siteUrl}${path}`;

  return {
    title: { absolute: fullTitle },
    description: desc,
    keywords: keywords ? [...siteConfig.keywords, ...keywords] : undefined,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: 'website',
      ...(image && { images: [{ url: image, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: desc,
      ...(image && { images: [image] }),
    },
  };
}
