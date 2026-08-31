// src/components/admin/new-order-modal.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useCreateAdminOrderMutation, useGetBooksQuery } from '@/redux/catalog-api';
import { useDebounce } from '@/hooks/use-debounce';
import { notify } from '@/lib/notify';
import { fmtCedis } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { Book } from '@/data/catalog';
import { FormError, FormField, fieldCls, useFieldErrors } from './form-field';

type FieldKey = 'name' | 'email' | 'phone' | 'address' | 'city' | 'items' | 'promoCode';

interface Line {
  id: number;
  title: string;
  price: number;
  qty: number;
  stock: number;
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Records an order taken in the shop or over the phone. Totals shown here are
 * an estimate - the server prices the order again on submit.
 */
export function NewOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();

  const [createOrder, { isLoading: saving }] = useCreateAdminOrderMutation();
  const { errors, setErrors, formError, setFormError, clearField, reset } = useFieldErrors<FieldKey>();

  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', city: '' });
  const [lines, setLines] = useState<Line[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [payment, setPayment] = useState<'Paid' | 'Pending'>('Paid');
  const [bookQuery, setBookQuery] = useState('');
  const debouncedQuery = useDebounce(bookQuery, 250);

  const { data: booksData, isFetching: searching } = useGetBooksQuery(
    { limit: 100 },
    { skip: !open },
  );

  const matches = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];
    const chosen = new Set(lines.map((l) => l.id));
    return (booksData?.data ?? [])
      .filter(
        (b: Book) =>
          !chosen.has(b.id) &&
          (b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [debouncedQuery, booksData, lines]);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  const setField = (key: keyof typeof customer) => (value: string) => {
    setCustomer((cur) => ({ ...cur, [key]: value }));
    clearField(key as FieldKey);
  };

  const addLine = (book: Book) => {
    setLines((cur) => [
      ...cur,
      { id: book.id, title: book.title, price: book.price, qty: 1, stock: book.stock },
    ]);
    setBookQuery('');
    clearField('items');
  };

  const changeQty = (id: number, delta: number) =>
    setLines((cur) =>
      cur
        .map((l) => (l.id === id ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    );

  const removeLine = (id: number) => setLines((cur) => cur.filter((l) => l.id !== id));

  const closeAndReset = () => {
    setCustomer({ name: '', email: '', phone: '', address: '', city: '' });
    setLines([]);
    setPromoCode('');
    setPayment('Paid');
    setBookQuery('');
    reset();
    onClose();
  };

  const submit = async () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (customer.name.trim().length < 2) next.name = 'Customer name is required.';
    if (!EMAIL_RE.test(customer.email.trim())) next.email = 'Enter a valid email.';
    if (customer.phone.replace(/\D/g, '').length < 9) next.phone = 'Enter a valid phone number.';
    if (customer.address.trim().length < 5) next.address = 'Delivery address is required.';
    if (customer.city.trim().length < 2) next.city = 'City or town is required.';
    if (lines.length === 0) next.items = 'Add at least one title.';
    if (Object.keys(next).length > 0) {
      setErrors(next);
      setFormError('');
      return;
    }

    try {
      const res = await createOrder({
        name: customer.name.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        items: lines.map((l) => ({ id: l.id, qty: l.qty })),
        promoCode: promoCode.trim() || undefined,
        status: payment,
      }).unwrap();
      notify(res.message);
      const orderId = res.data.id;
      closeAndReset();
      router.push(`/admin/orders/${orderId}`);
    } catch (err) {
      // Stock and promo problems come back as readable sentences.
      setFormError('');
      const message = (err as { data?: { message?: string } })?.data?.message;
      if (message?.toLowerCase().includes('basket') || message?.toLowerCase().includes('stock')) {
        setErrors({ items: message });
      } else {
        setFormError(message ?? 'Could not create this order.');
      }
    }
  };

  return (
    <Modal open={open} onClose={closeAndReset} labelledBy={titleId} className="sm:max-w-[560px]">
      <h2 id={titleId} className="mb-1 font-serif text-2xl font-normal text-ink">
        New order
      </h2>
      <p className="mb-5 text-[13px] text-sage">
        For a walk-in or telephone order. Paid orders take their copies off the shelf straight away.
      </p>

      <div className="flex flex-col gap-4">
        <FormField label="Customer name" error={errors.name}>
          {(props) => (
            <input
              {...props}
              value={customer.name}
              onChange={(e) => setField('name')(e.target.value)}
              placeholder="Ama Mensah"
            />
          )}
        </FormField>

        <div className="flex flex-wrap gap-4">
          <FormField label="Email" error={errors.email} className="flex-[1_1_200px]">
            {(props) => (
              <input
                {...props}
                type="email"
                value={customer.email}
                onChange={(e) => setField('email')(e.target.value)}
                placeholder="ama@example.com"
              />
            )}
          </FormField>
          <FormField label="Phone" error={errors.phone} className="flex-[1_1_160px]">
            {(props) => (
              <input
                {...props}
                value={customer.phone}
                onChange={(e) => setField('phone')(e.target.value)}
                placeholder="024 555 0182"
              />
            )}
          </FormField>
        </div>

        <FormField label="Delivery address" error={errors.address}>
          {(props) => (
            <input
              {...props}
              value={customer.address}
              onChange={(e) => setField('address')(e.target.value)}
              placeholder="14 Aboabo Market Road"
            />
          )}
        </FormField>

        <FormField label="City or town" error={errors.city} className="max-w-[260px]">
          {(props) => (
            <input
              {...props}
              value={customer.city}
              onChange={(e) => setField('city')(e.target.value)}
              placeholder="Tamale"
            />
          )}
        </FormField>

        {/* Book picker */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order-book-search" className="text-[13px] font-bold text-ink">
            Titles
          </label>
          <div className="relative">
            <input
              id="order-book-search"
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              placeholder="Search the catalogue by title or author…"
              aria-invalid={Boolean(errors.items)}
              className={cn(fieldCls(Boolean(errors.items)), 'w-full')}
            />
            {bookQuery.trim() && (
              <div className="absolute top-full right-0 left-0 z-10 max-h-56 overflow-y-auto border border-mist bg-cream shadow-lg">
                {matches.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => addLine(book)}
                    className="flex w-full cursor-pointer items-center gap-3 border-b border-pale px-3 py-2.5 text-left last:border-0 hover:bg-pine/7"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-ink">{book.title}</span>
                      <span className="block truncate text-[11.5px] text-sage">{book.author}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[12.5px] font-bold">{fmtCedis(book.price)}</span>
                      <span className="block text-[11px] text-sage">{book.stock} in stock</span>
                    </span>
                  </button>
                ))}
                {matches.length === 0 && (
                  <div className="px-3 py-3 text-[12.5px] text-sage">
                    {searching ? 'Searching…' : 'No titles match that search.'}
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.items && <p className="text-[12.5px] font-medium text-rust">{errors.items}</p>}

          {lines.length > 0 && (
            <div className="mt-1.5 flex flex-col border border-mist">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2 border-b border-pale px-3 py-2 last:border-0">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold">{line.title}</span>
                    <span className="block text-[11.5px] text-sage">{fmtCedis(line.price)} each</span>
                  </span>
                  <span className="flex shrink-0 items-center border border-mist">
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, -1)}
                      aria-label={`One fewer ${line.title}`}
                      className="h-7 w-7 cursor-pointer text-[15px] font-bold text-ink hover:bg-pale"
                    >
                      −
                    </button>
                    <span className="min-w-[22px] text-center text-[13px] font-bold">{line.qty}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(line.id, 1)}
                      aria-label={`One more ${line.title}`}
                      className="h-7 w-7 cursor-pointer text-[15px] font-bold text-ink hover:bg-pale"
                    >
                      +
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    aria-label={`Remove ${line.title}`}
                    className="shrink-0 cursor-pointer px-1.5 text-[13px] font-bold text-sage hover:text-rust"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between bg-pale/50 px-3 py-2 text-[13px] font-bold">
                <span>Subtotal</span>
                <span>{fmtCedis(subtotal)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4">
          <FormField
            label="Promo code"
            error={errors.promoCode}
            hint="Optional"
            className="flex-[1_1_160px]"
          >
            {(props) => (
              <input
                {...props}
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  clearField('promoCode');
                }}
                placeholder="SEASON15"
              />
            )}
          </FormField>
          <FormField label="Payment" className="flex-[1_1_160px]">
            {(props) => (
              <select
                {...props}
                value={payment}
                onChange={(e) => setPayment(e.target.value as 'Paid' | 'Pending')}
                className={cn(props.className, 'cursor-pointer font-semibold')}
              >
                <option value="Paid">Paid now</option>
                <option value="Pending">Pending payment</option>
              </select>
            )}
          </FormField>
        </div>

        <FormError message={formError} />

        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={closeAndReset} className="btn-quiet px-5 py-2.5 text-[13px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
          >
            {saving ? 'Creating…' : 'Create order'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
