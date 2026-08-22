// src/components/ui/Modal.tsx
'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHydrated } from '@/hooks/use-hydrated';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** id of the title element for aria-labelledby. */
  labelledBy?: string;
  /** Show the top-right close button (default true). */
  showClose?: boolean;
}

/**
 * Accessible modal base: portal, scrim, Escape, click-outside, body
 * scroll-lock and focus restore. Bottom sheet on mobile, centered card
 * from sm up.
 */
export function Modal({ open, onClose, children, className, labelledBy, showClose = true }: ModalProps) {
  const hydrated = useHydrated();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!hydrated || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-90 flex items-end justify-center sm:items-center">
      {/* Clicks land on the scrim itself (it overlays everything outside the
          panel), so close directly here - comparing target against the outer
          container never matches. */}
      <div
        className="absolute inset-0 bg-[rgba(18,30,23,0.45)]"
        onMouseDown={() => closeRef.current()}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          'glass relative z-10 w-full max-h-[92dvh] overflow-y-auto bg-cream/95 p-6 outline-none',
          'pb-[max(24px,env(safe-area-inset-bottom))] sm:max-w-[420px] sm:pb-6',
          'animate-fade-up',
          className,
        )}
      >
        {showClose && (
          <button
            type="button"
            onClick={() => closeRef.current()}
            aria-label="Close dialog"
            className="absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-[15px] font-bold text-sage hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
