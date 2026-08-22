// src/components/admin/table/cells.tsx
// Shared cell components + selection helpers for the data-table kit, so
// entity clients stop hand-rolling the same fragments: select column,
// avatar/money/title cells.
'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { initials, fmtCedis } from '@/lib/format';

/* ── Selection ─────────────────────────────────────────────────────── */

export function SelectCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-[15px] w-[15px] cursor-pointer accent-pine"
    />
  );
}

export interface RowSelection<K extends string | number> {
  sel: K[];
  allSelected: boolean;
  toggleAll: () => void;
  toggleOne: (key: K) => void;
  clear: () => void;
  remove: (key: K) => void;
}

/** Page-local row selection (select-all covers the current page). */
export function useRowSelection<K extends string | number>(pageKeys: K[]): RowSelection<K> {
  const [sel, setSel] = useState<K[]>([]);
  const allSelected = pageKeys.length > 0 && pageKeys.every((key) => sel.includes(key));
  return {
    sel,
    allSelected,
    toggleAll: () =>
      setSel((cur) =>
        allSelected
          ? cur.filter((key) => !pageKeys.includes(key))
          : [...new Set([...cur, ...pageKeys])],
      ),
    toggleOne: (key) =>
      setSel((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key])),
    clear: () => setSel([]),
    remove: (key) => setSel((cur) => cur.filter((x) => x !== key)),
  };
}

/* ── Cells ─────────────────────────────────────────────────────────── */

/** Square avatar: profile picture when present, initials otherwise. */
export function AvatarCell({
  name,
  image,
  color = '#2E6B4F',
  size = 34,
  textClass = 'text-[12.5px]',
}: {
  name: string;
  image?: string | null;
  color?: string;
  size?: number;
  textClass?: string;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL, plain img like BookCover
      <img
        src={image}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 object-cover"
      />
    );
  }
  return (
    <span
      className={cn('inline-flex flex-none items-center justify-center font-bold text-cream-bright', textClass)}
      style={{ background: color, width: size, height: size }}
    >
      {initials(name)}
    </span>
  );
}

/** Right-aligned money value; steps the font down as the string grows. */
export function MoneyCell({ amount, className }: { amount: number; className?: string }) {
  const formatted = fmtCedis(amount);
  return (
    <span
      className={cn(
        'font-bold whitespace-nowrap',
        formatted.length > 14 ? 'text-[11.5px]' : formatted.length > 11 ? 'text-[12.5px]' : 'text-[13.5px]',
        className,
      )}
    >
      {formatted}
    </span>
  );
}

/** The two-truncating-lines cell every list uses for its main column. */
export function TitleWithSubtitle({
  title,
  subtitle,
  titleExtra,
  onOpen,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  /** Inline addition after the title (e.g. an Account pill or "· You"). */
  titleExtra?: ReactNode;
  /** Makes the title itself clickable (stopPropagation handled by caller). */
  onOpen?: () => void;
}) {
  const titleLine = titleExtra ? (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="truncate">{title}</span>
      {titleExtra}
    </span>
  ) : (
    <span className="block truncate">{title}</span>
  );

  return (
    <span
      onClick={
        onOpen
          ? (e) => {
              e.stopPropagation();
              onOpen();
            }
          : undefined
      }
      className={cn('block min-w-0', onOpen && 'cursor-pointer')}
    >
      <span
        className={cn(
          'block truncate text-[13.5px] font-bold',
          onOpen && 'hover:text-pine hover:underline',
        )}
      >
        {titleLine}
      </span>
      <span className="block truncate text-xs text-sage">{subtitle}</span>
    </span>
  );
}
