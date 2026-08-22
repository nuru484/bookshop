// src/components/store/announcement-popup.tsx
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useHydrated } from '@/hooks/use-hydrated';

const DISMISS_KEY = 'hb-announcement-dismissed';

/**
 * The free-delivery notice as a dismissible popup card. Dismissal persists
 * in localStorage so it stays closed.
 */
export function AnnouncementPopup() {
  const hydrated = useHydrated();
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated || dismissed) return null;
  if (typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1') return null;

  const close = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="animate-fade-up fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[440px] items-start gap-3 bg-ink px-4 py-3.5 text-cream shadow-[0_14px_40px_rgba(18,30,23,0.4)] sm:inset-x-auto sm:right-auto sm:bottom-6 sm:left-6 sm:mx-0"
    >
      <span aria-hidden="true" className="mt-[3px] h-8 w-[3px] shrink-0 bg-gold" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold tracking-[0.24em] text-gold uppercase">
          Good news
        </div>
        <p className="m-0 mt-1 text-[13px] leading-[1.55] font-medium">
          Free delivery in Tamale on orders over GH₵250 · We ship nationwide
        </p>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss announcement"
        className="shrink-0 cursor-pointer border-none bg-transparent p-1 text-pale/60 transition-colors hover:text-cream"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
