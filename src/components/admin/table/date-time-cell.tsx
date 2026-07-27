// src/components/admin/table/date-time-cell.tsx
import { cn } from '@/lib/utils';
import { fmtDate, fmtTime } from '@/lib/format';

/**
 * Date cell for data tables: the date with the time in small sage text
 * directly below it (time omitted for date-only values).
 */
export function DateTimeCell({ iso, align = 'left' }: { iso: string; align?: 'left' | 'right' }) {
  const time = fmtTime(iso);
  return (
    <span className={cn('block', align === 'right' && 'text-right')}>
      <span className="block text-[12.5px] font-medium whitespace-nowrap text-moss">{fmtDate(iso)}</span>
      {time && <span className="block text-[11px] whitespace-nowrap text-sage">{time}</span>}
    </span>
  );
}
