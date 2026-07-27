// src/components/store/legal-page.tsx
// Shared shell for the legal pages (privacy, terms) - serif-led prose in a
// readable measure, consistent section styling.
import type { ReactNode } from 'react';

export function LegalPage({
  title,
  intro,
  updated,
  children,
}: {
  title: string;
  intro: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up mx-auto w-full max-w-[70ch] pt-12 pb-20">
      <div className="mb-2 text-[11px] font-bold tracking-[0.26em] text-pine uppercase">
        Harmattan Books
      </div>
      <h1 className="m-0 mb-3 font-serif text-[clamp(32px,5vw,44px)] leading-[1.1] font-normal">
        {title}
      </h1>
      <p className="m-0 mb-2 max-w-[60ch] text-[15.5px] leading-[1.7] text-moss">{intro}</p>
      <p className="m-0 mb-9 text-[12.5px] font-semibold text-sage">Last updated: {updated}</p>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="m-0 mb-2.5 font-serif text-[24px] font-normal text-ink">{heading}</h2>
      <div className="flex flex-col gap-3 text-[14.5px] leading-[1.75] text-moss [&_strong]:text-ink">
        {children}
      </div>
    </div>
  );
}
