// src/components/ui/EmptyState.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'dark' | 'outline';
}

export interface EmptyStateProps {
  /** Small accent kicker above the title. */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Single action; renders a Link when href is given, else a button. */
  action?: EmptyStateAction;
  className?: string;
}

const ACTION_CLASS: Record<NonNullable<EmptyStateAction['variant']>, string> = {
  primary: 'btn-primary',
  dark: 'btn-dark',
  outline: 'btn-outline-ink',
};

/**
 * The design's dashed-glass empty state: serif title, sage copy,
 * optional single call to action.
 */
export function EmptyState({ eyebrow, title, description, action, className }: EmptyStateProps) {
  const actionClass = cn(
    ACTION_CLASS[action?.variant ?? 'primary'],
    'inline-block px-6 py-3 text-sm',
  );

  return (
    <div className={cn('glass-dashed px-5 py-[50px] text-center', className)}>
      {eyebrow && <div className="eyebrow mb-3 text-[11px]">{eyebrow}</div>}
      <div className="mb-2 font-serif text-2xl text-ink">{title}</div>
      {description && <p className="mx-auto mb-[18px] max-w-[44ch] text-sm text-sage">{description}</p>}
      {action &&
        (action.href ? (
          <Link href={action.href} className={cn(actionClass, 'no-underline hover:no-underline')}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClass}>
            {action.label}
          </button>
        ))}
    </div>
  );
}
