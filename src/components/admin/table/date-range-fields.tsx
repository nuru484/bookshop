// src/components/admin/table/date-range-fields.tsx
'use client';

export interface DateRange {
  from?: string;
  to?: string;
}

const dateCls =
  'box-border h-11 w-full border border-ink/22 bg-white/55 px-2.5 text-[13px] font-semibold text-ink outline-none lg:w-[148px]';

/**
 * From/To native date fields exchanging YYYY-MM-DD strings, mutually
 * bounding (from <= to). Counts as ONE active filter. Renders as two
 * labeled cells so a grid-cols-2 wrapper shows them side by side on
 * small screens; inline and compact on lg+.
 */
export function DateRangeFields({
  from,
  to,
  onChange,
  fromLabel = 'From',
  toLabel = 'To',
}: DateRange & {
  onChange: (range: DateRange) => void;
  fromLabel?: string;
  toLabel?: string;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-[10px] font-bold tracking-[0.08em] whitespace-nowrap text-sage uppercase">
          {fromLabel}
        </label>
        <input
          type="date"
          value={from ?? ''}
          max={to || undefined}
          onChange={(e) => onChange({ from: e.target.value || undefined, to })}
          className={dateCls}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <label className="text-[10px] font-bold tracking-[0.08em] whitespace-nowrap text-sage uppercase">
          {toLabel}
        </label>
        <input
          type="date"
          value={to ?? ''}
          min={from || undefined}
          onChange={(e) => onChange({ from, to: e.target.value || undefined })}
          className={dateCls}
        />
      </div>
    </>
  );
}
