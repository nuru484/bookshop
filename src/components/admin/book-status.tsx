// src/components/admin/book-status.tsx
import type { BookStatus } from '@/data/catalog';

export const BOOK_STATUSES: BookStatus[] = ['Published', 'Draft', 'Archived'];

const COLORS: Record<BookStatus, { bg: string; fg: string }> = {
  Published: { bg: '#E4EBDF', fg: '#3E5A41' },
  Draft: { bg: '#F3E7CE', fg: '#8A6414' },
  Archived: { bg: '#DCE3D8', fg: '#6A7A66' },
};

export function bookStatusPill(status: BookStatus | undefined, compact = false) {
  const s: BookStatus = status ?? 'Published';
  const c = COLORS[s];
  return (
    <span
      className={
        compact
          ? 'px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] whitespace-nowrap'
          : 'px-[11px] py-1 text-[11px] font-bold tracking-[0.05em] whitespace-nowrap'
      }
      style={{ background: c.bg, color: c.fg }}
    >
      {s}
    </span>
  );
}

/** The status-change quick actions that differ from the current status. */
export const statusActions = (current: BookStatus | undefined): { label: string; status: BookStatus }[] =>
  [
    { label: 'Publish', status: 'Published' as BookStatus },
    { label: 'Move to draft', status: 'Draft' as BookStatus },
    { label: 'Archive', status: 'Archived' as BookStatus },
  ].filter((a) => a.status !== (current ?? 'Published'));
