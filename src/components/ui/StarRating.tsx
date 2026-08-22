// src/components/ui/StarRating.tsx
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StarRatingProps {
  /** 0-5 rating; rounded to whole stars. */
  rating: number;
  /** Star edge in pixels - match it to the surrounding text size. */
  size?: number;
  className?: string;
}

/**
 * Five stars, solid up to the rounded rating and outlined after it. Inherits
 * colour from its parent, so the gold rating rows keep their colour.
 */
export function StarRating({ rating, size = 14, className }: StarRatingProps) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <span
      role="img"
      aria-label={`${filled} out of 5 stars`}
      className={cn('inline-flex items-center gap-px align-[-2px]', className)}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          fill={i < filled ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
