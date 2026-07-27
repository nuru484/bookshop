import { brandOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og-template';

export const alt = 'Harmattan Books - independent booksellers in Tamale';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function HomeOpengraphImage() {
  return brandOgImage({
    eyebrow: 'Est. 2019 · Tamale, Northern Region',
    title: 'Read the season slowly.',
    subtitle: 'Hand-picked classics, kept in print and delivered anywhere in Ghana.',
  });
}
