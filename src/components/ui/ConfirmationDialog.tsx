// src/components/ui/ConfirmationDialog.tsx
'use client';

import { useId, type ReactNode } from 'react';
import { Modal } from './Modal';
import { cn } from '@/lib/utils';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  /** Extra content between description and actions. */
  children?: ReactNode;
}

/**
 * The confirmation gate every destructive or consequential action goes
 * through: serif title, plain-language description, Cancel + Confirm.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  children,
}: ConfirmationDialogProps) {
  const titleId = useId();

  const confirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} labelledBy={titleId}>
      <div
        className={cn(
          'mb-4 flex h-11 w-11 items-center justify-center text-lg font-bold',
          isDestructive ? 'bg-rust-pale text-rust' : 'bg-fern-pale text-fern',
        )}
        aria-hidden="true"
      >
        {isDestructive ? '✕' : '✓'}
      </div>
      <h2 id={titleId} className="mb-2 font-serif text-2xl font-normal text-ink">
        {title}
      </h2>
      <div className="mb-5 text-sm leading-relaxed text-moss">{description}</div>
      {children}
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="btn-quiet px-5 py-2.5 text-[13px]"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={confirm}
          className={cn(isDestructive ? 'btn-outline-rust' : 'btn-primary', 'px-5 py-2.5 text-[13px]')}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
