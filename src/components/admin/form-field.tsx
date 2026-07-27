// src/components/admin/form-field.tsx
'use client';

import { useCallback, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { extractApiError } from '@/utils/extract-api-error';

/**
 * Shared field chrome for every admin form: label on top, control, and the
 * error printed directly under THAT field so the reader knows which input is
 * wrong. The control gets the rust border, aria-invalid and aria-describedby
 * wiring through the render prop.
 */
export interface FormFieldProps {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  /** Receives the props every control needs for a11y + error styling. */
  children: (props: {
    id: string;
    className: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

export const FIELD_BASE = 'input-glass px-3.5 py-3 text-[14.5px]';
const LABEL_CLS = 'text-[13px] font-bold text-ink';

/** Input classes with the rust error border applied when relevant. */
export const fieldCls = (hasError: boolean, extra?: string): string =>
  cn(FIELD_BASE, hasError && 'border-rust focus:border-rust', extra);

export function FormField({ label, error, hint, className, children }: FormFieldProps) {
  const reactId = useId();
  const id = `f-${reactId}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
      </label>
      {children({
        id,
        className: fieldCls(Boolean(error)),
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {error ? (
        <p id={errorId} className="text-[12.5px] font-medium text-rust">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[11.5px] text-sage">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Form-level error (server failures that belong to no single field). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="border border-rust/25 bg-rust-pale/60 p-3 text-[12.5px] font-medium text-rust">
      {message}
    </div>
  );
}

/**
 * Per-field error state with the two moves every form needs: clear one field
 * as the user types, and map a server response onto its fields.
 */
export function useFieldErrors<K extends string>() {
  const [errors, setErrors] = useState<Partial<Record<K, string>>>({});
  const [formError, setFormError] = useState('');

  const clearField = useCallback((key: K) => {
    setErrors((cur) => {
      if (!cur[key]) return cur;
      const next = { ...cur };
      delete next[key];
      return next;
    });
    setFormError('');
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setFormError('');
  }, []);

  /**
   * Routes a server error to its field when the API named one, otherwise to
   * the form-level slot. `map` translates API field names to form keys.
   */
  const applyServerError = useCallback((error: unknown, map?: Partial<Record<string, K>>) => {
    const parsed = extractApiError(error);
    if (parsed.hasFieldErrors && parsed.fieldErrors) {
      const next: Partial<Record<K, string>> = {};
      let matched = false;
      Object.entries(parsed.fieldErrors).forEach(([apiField, message]) => {
        const key = (map?.[apiField] ?? apiField) as K;
        next[key] = message;
        matched = true;
      });
      if (matched) {
        setErrors(next);
        setFormError('');
        return parsed.message;
      }
    }
    setFormError(parsed.message);
    return parsed.message;
  }, []);

  return { errors, setErrors, formError, setFormError, clearField, reset, applyServerError };
}
