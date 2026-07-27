// src/components/ui/StatusPill.tsx
import { cn } from '@/lib/utils';
import { orderPill, stockPill } from '@/lib/status-colors';
import type { OrderStatus } from '@/data/catalog';

/** Order-status pill, colored from the shared status map. */
export function StatusPill({
  status,
  className,
}: {
  status: OrderStatus | string;
  className?: string;
}) {
  const pill = orderPill(status);
  return (
    <span
      className={cn('px-[11px] py-1 text-[11px] font-bold tracking-[0.05em]', className)}
      style={{ background: pill.bg, color: pill.fg }}
    >
      {status}
    </span>
  );
}

/** Stock-level pill: "Out of stock" / "4 left" / "24 in stock". */
export function StockLevelPill({
  stock,
  threshold,
  className,
}: {
  stock: number;
  threshold?: number;
  className?: string;
}) {
  const pill = stockPill(stock, threshold);
  return (
    <span
      className={cn('px-[11px] py-1 text-[11px] font-bold tracking-[0.04em]', className)}
      style={{ background: pill.bg, color: pill.fg }}
    >
      {pill.label}
    </span>
  );
}
