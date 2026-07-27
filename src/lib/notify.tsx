// src/lib/notify.tsx
'use client';

import toast from 'react-hot-toast';

/**
 * The design's toast: a single dark bar, bottom-center, that fades up.
 * One visual for every tone - the copy carries the meaning.
 */
function show(message: string, duration = 2400): string {
  return toast.custom(
    (t) => (
      <div
        role="status"
        className="animate-toast-in max-w-[88vw] truncate bg-ink px-[22px] py-3 text-sm font-semibold text-cream shadow-[0_10px_30px_rgba(18,30,23,0.35)]"
        style={{ opacity: t.visible ? 1 : 0, transition: 'opacity .2s' }}
      >
        {message}
      </div>
    ),
    { duration, position: 'bottom-center' },
  );
}

export const notify = Object.assign(show, {
  success: (message: string) => show(message),
  error: (message: string) => show(message),
  info: (message: string) => show(message),
  dismiss: (id?: string) => toast.dismiss(id),
});
