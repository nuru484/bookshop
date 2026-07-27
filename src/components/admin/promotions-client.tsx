// src/components/admin/promotions-client.tsx
'use client';

import { useId, useState } from 'react';
import {
  useGetPromosQuery,
  useCreatePromoMutation,
  useTogglePromoActiveMutation,
  useDeletePromoMutation,
  type IPromoRecord,
} from '@/redux/catalog-api';
import { useConfirm } from '@/hooks/use-confirm';
import { notify } from '@/lib/notify';
import { extractApiError } from '@/utils/extract-api-error';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { GENRES } from '@/data/catalog';
import { PageHeader } from './page-header';
import { FormError, FormField, useFieldErrors } from './form-field';
import { refetchDim } from './api-helpers';

function NewPromoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const [createPromo, { isLoading: creating }] = useCreatePromoMutation();

  const [code, setCode] = useState('');
  const [off, setOff] = useState('');
  const [desc, setDesc] = useState('');
  const [genre, setGenre] = useState('');
  const { errors, setErrors, formError, setFormError, clearField, reset, applyServerError } =
    useFieldErrors<'code' | 'off' | 'desc'>();

  // Reset on reopen (adjust-during-render pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setCode('');
      setOff('');
      setDesc('');
      setGenre('');
      reset();
    }
  }

  const submit = async () => {
    const trimmed = code.trim().toUpperCase();
    const offN = parseInt(off, 10);
    const next: Partial<Record<'code' | 'off', string>> = {};
    if (trimmed.length < 3 || !/^[A-Z0-9]+$/.test(trimmed))
      next.code = 'Give it a code of at least 3 letters or numbers.';
    if (!(offN >= 1 && offN <= 90)) next.off = 'Between 1 and 90%.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }
    try {
      const res = await createPromo({
        code: trimmed,
        percentOff: offN,
        description: desc.trim() || undefined,
        genre: genre || null,
      }).unwrap();
      notify(res.message);
      onClose();
    } catch (e) {
      // A duplicate code names the code field.
      const message = applyServerError(e);
      if (/already exists/i.test(message)) {
        setErrors({ code: message });
        setFormError('');
      }
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="m-0 mb-1 font-serif text-2xl font-normal text-ink">
        New promotion
      </h2>
      <p className="m-0 mb-4 text-[13px] text-sage">
        The code goes live on the storefront checkout immediately.
      </p>
      <div className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[1fr_110px] gap-3.5">
          <FormField label="Code" error={errors.code}>
            {(props) => (
              <input
                {...props}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  clearField('code');
                }}
                placeholder="AUGUSTREADS"
                className={cn(props.className, 'font-semibold tracking-[0.05em]')}
              />
            )}
          </FormField>
          <FormField label="% off" error={errors.off}>
            {(props) => (
              <input
                {...props}
                value={off}
                onChange={(e) => {
                  setOff(e.target.value.replace(/\D/g, '').slice(0, 2));
                  clearField('off');
                }}
                placeholder="15"
                inputMode="numeric"
              />
            )}
          </FormField>
        </div>
        <FormField label="Description" error={errors.desc}>
          {(props) => (
            <input
              {...props}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value);
                clearField('desc');
              }}
              placeholder="What's the occasion?"
            />
          )}
        </FormField>
        <FormField label="Applies to">
          {(props) => (
            <select
              {...props}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className={cn(props.className, 'cursor-pointer font-semibold')}
            >
              <option value="">All shelves</option>
              {GENRES.filter((g) => g !== 'All').map((g) => (
                <option key={g} value={g}>
                  {g} shelf only
                </option>
              ))}
            </select>
          )}
        </FormField>
        <FormError message={formError} />
        <div className="mt-1 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-quiet px-5 py-2.5 text-[13px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={creating}
            className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
          >
            {creating ? 'Creating…' : 'Create promotion'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PromoSkeleton() {
  return (
    <div aria-busy="true" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass px-5 py-4">
          <Skeleton className="mb-3 h-8 w-36" />
          <Skeleton className="mb-2 h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

function PromoCard({
  promo,
  onToggle,
  onDelete,
}: {
  promo: IPromoRecord;
  onToggle: (p: IPromoRecord) => void;
  onDelete: (p: IPromoRecord) => void;
}) {
  return (
    <div className={cn('glass flex flex-col gap-3 px-5 py-4', !promo.active && 'opacity-55')}>
      <div>
        <span className="inline-block border-[1.5px] border-dashed border-gold bg-cream px-3.5 py-[7px] text-sm font-bold tracking-[0.06em] text-gold-deep">
          {promo.code}
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{promo.description}</div>
        <div className="mt-0.5 text-[12.5px] text-sage">
          {promo.percentOff}% off · {promo.genre ? `${promo.genre} shelf` : 'All shelves'} ·{' '}
          {promo.active ? 'live on the storefront' : 'paused'}
        </div>
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-mist pt-3">
        <button
          type="button"
          onClick={() => onToggle(promo)}
          className={cn(
            'cursor-pointer border-[1.5px] px-4 py-2 text-[12.5px] font-bold',
            promo.active
              ? 'border-mist bg-transparent text-sage hover:border-ink hover:text-ink'
              : 'border-pine bg-pine text-cream-bright hover:bg-pine-deep',
          )}
        >
          {promo.active ? 'Pause' : 'Activate'}
        </button>
        <button
          type="button"
          onClick={() => onDelete(promo)}
          className="btn-outline-rust ml-auto px-4 py-2 text-[12.5px]"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function PromotionsClient() {
  const { confirm, dialog } = useConfirm();
  const { data, isLoading, isFetching, isError, refetch } = useGetPromosQuery();
  const [togglePromo] = useTogglePromoActiveMutation();
  const [deletePromo] = useDeletePromoMutation();
  const [adding, setAdding] = useState(false);

  const promos = data?.data ?? [];

  const onToggle = (p: IPromoRecord) =>
    confirm({
      title: p.active ? `Pause ${p.code}?` : `Activate ${p.code}?`,
      description: p.active
        ? 'Customers will no longer be able to apply this code at checkout.'
        : 'The code goes live on the storefront immediately.',
      confirmText: p.active ? 'Pause' : 'Activate',
      onConfirm: async () => {
        try {
          const res = await togglePromo(p.id).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  const onDelete = (p: IPromoRecord) =>
    confirm({
      title: `Delete ${p.code}?`,
      description: 'The code stops working at checkout and disappears from this list. This cannot be undone.',
      confirmText: 'Delete promotion',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const res = await deletePromo(p.id).unwrap();
          notify(res.message);
        } catch (err) {
          notify(extractApiError(err).message);
        }
      },
    });

  return (
    <div className="max-w-[880px] animate-fade-up">
      <PageHeader
        title="Promotions"
        subtitle="Discount codes running on the storefront checkout."
        actions={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-primary h-11 px-5 text-[13.5px] whitespace-nowrap shadow-none"
          >
            + New promotion
          </button>
        }
      />

      {isLoading ? (
        <PromoSkeleton />
      ) : isError ? (
        <ErrorState title="Couldn't load the promotions" onRetry={() => void refetch()} />
      ) : promos.length === 0 ? (
        <EmptyState
          title="No promotions yet."
          description="Create a discount code and it will be usable at checkout right away."
          action={{ label: '+ New promotion', onClick: () => setAdding(true) }}
        />
      ) : (
        <div className={cn('grid grid-cols-1 gap-3 lg:grid-cols-2', refetchDim(isFetching, isLoading))}>
          {promos.map((p) => (
            <PromoCard key={p.id} promo={p} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}

      <NewPromoModal open={adding} onClose={() => setAdding(false)} />
      {dialog}
    </div>
  );
}
