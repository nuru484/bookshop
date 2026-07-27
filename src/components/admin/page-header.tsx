// src/components/admin/page-header.tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The one header pattern every admin page shares: serif title, one-line
 * sage subtitle, optional right-side actions.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="m-0 font-serif text-[32px] font-normal">{title}</h1>
        {subtitle && <div className="mt-1 text-[13.5px] font-medium text-sage">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}
