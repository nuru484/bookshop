// src/components/ui/BookCover.tsx
'use client';

import { cn } from '@/lib/utils';
import { coverUrl, shelfColor } from '@/data/catalog';

interface BookCoverProps {
  book: { title: string; author?: string; isbn: string; genre: string };
  /** Open Library image size. */
  size?: 'M' | 'L';
  /** Show the author line inside the fallback. */
  showAuthor?: boolean;
  /** Text sizing preset for the fallback. */
  fallback?: 'card' | 'large' | 'tiny';
  className?: string;
}

const FALLBACK_TITLE: Record<NonNullable<BookCoverProps['fallback']>, string> = {
  card: 'text-[15px]',
  large: 'text-[22px]',
  tiny: 'text-[11px]',
};

/**
 * 2:3 book cover with a colored fallback: the shelf
 * color + title/author show underneath, and the Open Library cover image
 * simply hides itself when it fails to load.
 */
export function BookCover({ book, size = 'L', showAuthor = true, fallback = 'card', className }: BookCoverProps) {
  return (
    <div className={cn('relative aspect-2/3 overflow-hidden', className)}>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3.5 text-center"
        style={{ background: shelfColor(book.genre) }}
      >
        <div className={cn('font-serif leading-tight text-cream', FALLBACK_TITLE[fallback])}>{book.title}</div>
        {showAuthor && book.author && fallback !== 'tiny' && (
          <div className="text-[9px] font-bold tracking-[0.12em] text-cream/75 uppercase">{book.author}</div>
        )}
      </div>
      {book.isbn && (
        // eslint-disable-next-line @next/next/no-img-element -- external Open Library covers with onError fallback
        <img
          src={coverUrl(book.isbn, size)}
          alt={book.title}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}
