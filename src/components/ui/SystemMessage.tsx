// src/components/ui/SystemMessage.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SystemMessageAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'dark' | 'outline';
}

export interface SystemMessageProps {
  /** Big display number, e.g. "404" - mutually exclusive with glyph. */
  code?: string;
  /** Mark shown in the dark square above the title: a character or an icon element. */
  glyph?: ReactNode;
  title: string;
  description?: string;
  actions?: SystemMessageAction[];
  className?: string;
}

const ACTION_CLASS: Record<NonNullable<SystemMessageAction['variant']>, string> = {
  primary: 'btn-primary',
  dark: 'btn-dark',
  outline: 'btn-outline-ink',
};

/**
 * Shared shell for full-page system states: 404, error boundary,
 * access denied. Centered and serif-led, in the shop's voice.
 */
export function SystemMessage({ code, glyph, title, description, actions, className }: SystemMessageProps) {
  return (
    <div className={cn('mx-auto w-full max-w-[560px] px-5 py-[70px] text-center animate-fade-up', className)}>
      {code ? (
        <div className="mb-2 font-serif text-[88px] leading-none text-pine">{code}</div>
      ) : glyph ? (
        <div className="mx-auto mb-[22px] flex h-16 w-16 items-center justify-center bg-ink text-[26px] text-cream">
          {glyph}
        </div>
      ) : null}
      <h1 className="mb-2.5 font-serif text-[40px] leading-tight font-normal text-ink">{title}</h1>
      {description && (
        <p className="mx-auto mb-[22px] max-w-[46ch] text-[15.5px] leading-[1.7] text-moss">{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions.map((action) => {
            const cls = cn(ACTION_CLASS[action.variant ?? 'dark'], 'px-6 py-[13px] text-sm');
            return action.href ? (
              <Link key={action.label} href={action.href} className={cn(cls, 'no-underline hover:no-underline')}>
                {action.label}
              </Link>
            ) : (
              <button key={action.label} type="button" onClick={action.onClick} className={cls}>
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
