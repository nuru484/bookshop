// src/app/(store)/search/page.tsx
import { pageMetadata } from '@/lib/seo';
import { SearchClient } from '@/components/store/search-client';

export const metadata = pageMetadata({
  title: 'Find a book',
  description: 'Search the whole Harmattan Books shelf by title or author.',
  path: '/search',
  index: false,
});

export default function SearchPage() {
  return <SearchClient />;
}
