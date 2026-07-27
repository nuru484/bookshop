import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

/**
 * Shared brand template for every Open Graph card (home, shop, book, author,
 * search, tracking, legal): canvas field, pine top rule, the real logo mark
 * from public/, page-specific text, and a call-to-action line so shares
 * invite a click.
 *
 * Satori (behind `ImageResponse`) supports only flexbox and a CSS subset - no
 * grid - so the layout stays flex-based. OG file conventions run on the Node
 * runtime, so the logo is read from disk and embedded as a data URI.
 */
export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const CANVAS = '#F0F4EE';
const INK = '#1C2A21';
const PINE = '#2E6B4F';
const GOLD = '#C2A65A';
const CREAM = '#F1F6EF';

const DEFAULT_CTA = 'Browse the shelves at harmattanbooks.com →';

export async function brandOgImage({
  eyebrow,
  title,
  subtitle,
  cta = DEFAULT_CTA,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** The conversion line on the card - tailor it per page. */
  cta?: string;
}) {
  const logo = await readFile(path.join(process.cwd(), 'public', 'logo-mark.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  // Scale the headline down as it gets longer so a long book or author name
  // still fits the card without overflowing.
  const titleSize = title.length > 34 ? 58 : title.length > 20 ? 78 : 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: CANVAS,
          color: INK,
          padding: '60px 76px',
          borderTop: `18px solid ${PINE}`,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: 8,
              textTransform: 'uppercase',
              color: PINE,
              fontWeight: 600,
              fontFamily: 'sans-serif',
            }}
          >
            {eyebrow}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            width={104}
            height={104}
            style={{ width: 104, height: 104, objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1 }}>{title}</div>
          <div
            style={{
              fontSize: 36,
              marginTop: 18,
              color: 'rgba(28,42,33,0.72)',
              fontFamily: 'sans-serif',
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginTop: 32,
              background: PINE,
              color: CREAM,
              padding: '16px 34px',
              fontSize: 28,
              fontFamily: 'sans-serif',
              fontWeight: 600,
            }}
          >
            {cta}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 25,
            fontFamily: 'sans-serif',
            color: 'rgba(28,42,33,0.7)',
            borderTop: `1px solid ${GOLD}`,
            paddingTop: 22,
          }}
        >
          <span>harmattanbooks.com</span>
          <span>Harmattan Books · Tamale, Ghana</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
