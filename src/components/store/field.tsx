// src/components/store/field.tsx
// Inline field-error primitives shared by every storefront form: the message
// sits under its own input, the input turns rust, and screen readers get the
// association through aria-invalid + aria-describedby.
import { cn } from '@/lib/utils';

/** id convention for a field's error node, so aria-describedby can find it. */
export const errorId = (fieldId: string): string => `${fieldId}-error`;

/** Adds the rust error treatment to an input's classes when it has an error. */
export const fieldCls = (base: string, hasError?: boolean): string =>
  cn(base, hasError && 'border-rust focus:border-rust');

/**
 * Spread onto an input to wire up the error state:
 * `{...fieldA11y('ck-email', errors.email)}`.
 */
export const fieldA11y = (fieldId: string, message?: string) =>
  ({
    'aria-invalid': message ? true : undefined,
    'aria-describedby': message ? errorId(fieldId) : undefined,
  }) as const;

/** The message itself - renders nothing when the field is valid. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(id)} role="alert" className="m-0 text-[12.5px] font-medium text-rust">
      {message}
    </p>
  );
}

/**
 * Form-level message for failures that belong to no single field (server
 * errors, rate limits). Field problems should never land here.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="border border-rust/25 bg-rust-pale/50 px-3.5 py-2.5">
      <p className="m-0 text-[12.5px] font-medium text-rust">{message}</p>
    </div>
  );
}
