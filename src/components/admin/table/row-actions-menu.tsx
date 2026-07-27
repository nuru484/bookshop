// src/components/admin/table/row-actions-menu.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/**
 * Compact 3-dot (⋮) actions menu for mobile row cards - keeps per-row
 * buttons out of the list. Opens a small fixed-position panel (portaled so
 * the table's overflow-hidden container can't clip it); closes on outside
 * press, Escape, scroll, resize, or picking an action. Clicks never bubble
 * to the row, so tapping the kebab doesn't open the record.
 */
export function RowActionsMenu({ actions, label }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = () => setOpen(false);

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onPress = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPress);
    document.addEventListener('touchstart', onPress);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPress);
      document.removeEventListener('touchstart', onPress);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label ? `Actions for ${label}` : 'Row actions'}
        className={cn(
          'flex h-8 w-7 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent text-[17px] leading-none font-bold',
          open ? 'text-ink' : 'text-sage hover:text-ink',
        )}
      >
        ⋮
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[95] min-w-[150px] border border-mist bg-cream shadow-[0_10px_30px_rgba(18,30,23,0.25)]"
            style={{ top: pos.top, right: pos.right }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  action.onSelect();
                }}
                className={cn(
                  'block w-full cursor-pointer border-none bg-transparent px-4 py-2.5 text-left text-[13px] font-semibold',
                  action.destructive ? 'text-rust hover:bg-rust-pale' : 'text-ink hover:bg-pale',
                )}
              >
                {action.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
