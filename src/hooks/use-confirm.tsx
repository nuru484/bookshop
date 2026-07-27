// src/hooks/use-confirm.tsx
'use client';

import { useState, type ReactNode } from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Imperative confirmation dialog - one per page. Destructure
 * `const { confirm, dialog } = useConfirm()`, call `confirm({...})` from
 * any action, render `{dialog}` once at the end of the page.
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
  };

  const dialog = options ? (
    <ConfirmationDialog
      open={open}
      onOpenChange={setOpen}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      isDestructive={options.isDestructive}
      onConfirm={() => void options.onConfirm()}
    />
  ) : null;

  return { confirm, dialog };
}
