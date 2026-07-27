// src/components/store/show-more.tsx
'use client';

import { useEffect, useRef } from 'react';

export const SHOP_PAGE_SIZE = 12;

interface ShowMoreProps {
  /** How many items are currently rendered. */
  shown: number;
  /** Total items available. */
  total: number;
  onMore: () => void;
  /** Plural noun for the count line, e.g. "titles" / "results". */
  noun?: string;
}

/**
 * Progressive pagination footer: "Showing X of N" line plus a "Show more"
 * button that also auto-loads when scrolled into view, so it behaves as
 * load-on-scroll with a button fallback.
 */
export function ShowMore({ shown, total, onMore, noun = 'titles' }: ShowMoreProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onMoreRef = useRef(onMore);

  useEffect(() => {
    onMoreRef.current = onMore;
  });

  const remaining = Math.max(total - shown, 0);

  useEffect(() => {
    const el = buttonRef.current;
    if (!el || remaining <= 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onMoreRef.current();
      },
      { rootMargin: '160px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [remaining]);

  if (total === 0) return null;

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div className="text-[12.5px] font-medium text-sage">
        Showing {Math.min(shown, total)} of {total} {noun}
      </div>
      {remaining > 0 && (
        <button
          ref={buttonRef}
          type="button"
          onClick={onMore}
          className="btn-outline-pine px-6 py-3 text-[13.5px]"
        >
          Show more ({remaining} remaining)
        </button>
      )}
    </div>
  );
}
