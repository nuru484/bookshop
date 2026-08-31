// src/components/store/store-header.tsx
'use client';

import Image from 'next/image';
import { siteConfig } from '@/lib/site';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, ShoppingBag, User, X } from 'lucide-react';
import { useAppSelector } from '@/redux/store';
import { useHydrated } from '@/hooks/use-hydrated';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useCartUi } from './cart-ui';
import { useWishlist } from './use-wishlist';

interface NavEntry {
  href: string;
  index: string;
  label: string;
  /** Extra path prefixes that also count as "this section". */
  also?: string[];
}

const NAV: NavEntry[] = [
  { href: '/', index: '01', label: 'Home' },
  { href: '/shop', index: '02', label: 'Shop', also: ['/books', '/authors'] },
  { href: '/search', index: '03', label: 'Search' },
  { href: '/wishlist', index: '04', label: 'Wishlist' },
];

function NavItem({
  entry,
  active,
  suffix,
}: {
  entry: NavEntry;
  active: boolean;
  suffix?: string;
}) {
  return (
    <Link
      href={entry.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[11.5px] font-bold tracking-[0.18em] uppercase no-underline transition-colors hover:no-underline',
        active ? 'text-pine' : 'text-ink hover:text-pine',
      )}
    >
      <span
        className={cn(
          'font-serif text-[10px] tracking-normal italic transition-colors',
          active ? 'text-gold-deep' : 'text-gold',
        )}
      >
        {entry.index}
      </span>
      <span className="whitespace-nowrap">
        {entry.label}
        {suffix}
      </span>
      {/* Sliding marker: stays lit on the active section */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-3 bottom-1 flex h-[2px] origin-left items-center transition-transform duration-200 ease-out',
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
        )}
      >
        <span className="h-full flex-1 bg-pine" />
        <span className="ml-[3px] h-[3px] w-[3px] shrink-0 bg-gold" />
      </span>
    </Link>
  );
}

export function StoreHeader() {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const cartCount = useAppSelector((s) => s.shop.cart.reduce((sum, c) => sum + c.qty, 0));
  const { wishlist } = useWishlist();
  const wishCount = wishlist.length;
  const customer = useAppSelector((s) => s.shop.customer);
  const { openCart } = useCartUi();

  const [menuOpen, setMenuOpen] = useState(false);

  const signedIn = hydrated && Boolean(customer);
  const accountActive = pathname === '/account' || pathname.startsWith('/account/');

  const isActive = (entry: NavEntry) =>
    entry.href === '/'
      ? pathname === '/'
      : pathname === entry.href ||
        pathname.startsWith(`${entry.href}/`) ||
        (entry.also ?? []).some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Close the drawer whenever the route changes (adjust-during-render).
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

  // Escape to close + body scroll lock while the drawer is open.
  const closeRef = useRef(() => setMenuOpen(false));
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  const wishSuffix = (entry: NavEntry) =>
    entry.href === '/wishlist' && hydrated && wishCount > 0 ? ` (${wishCount})` : undefined;

  /** The account entry: an avatar, not another text tab. */
  const avatarButton = (
    <Link
      href="/account"
      aria-label="Account"
      title={signedIn ? `Account · ${customer!.name}` : 'Account'}
      aria-current={accountActive ? 'page' : undefined}
      className={cn(
        'flex h-[38px] w-[38px] shrink-0 items-center justify-center no-underline transition-all hover:no-underline',
        signedIn
          ? 'bg-pine text-[13px] font-bold text-cream-bright hover:bg-pine-deep'
          : 'border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-cream',
        accountActive && 'ring-2 ring-gold ring-offset-2 ring-offset-cream',
      )}
    >
      {signedIn ? initials(customer!.name) : <User className="h-[17px] w-[17px]" />}
    </Link>
  );

  const basketButton = (extra?: string) => (
    <button
      type="button"
      onClick={() => {
        setMenuOpen(false);
        openCart();
      }}
      className={cn(
        'group/basket shrink-0 cursor-pointer items-center gap-2 border-none bg-ink px-4 py-[9px] text-[11.5px] font-bold tracking-[0.14em] text-cream uppercase transition-all duration-200 hover:bg-pine',
        extra ?? 'flex',
      )}
    >
      Basket
      <span className="inline-flex h-5 min-w-5 items-center justify-center bg-pine px-[5px] text-[11px] font-bold tracking-normal text-cream transition-colors duration-200 group-hover/basket:bg-ink">
        {hydrated ? cartCount : 0}
      </span>
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-mist bg-[rgba(243,246,240,0.42)] shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)] backdrop-blur-[30px] backdrop-saturate-[180%]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-5 py-3">
          <Link
            href="/"
            className="mr-auto flex min-w-0 items-center gap-2.5 leading-none no-underline hover:no-underline"
          >
            <Image
              src="/logo-mark.png"
              alt=""
              width={44}
              height={44}
              priority
              className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"
            />
            <span className="min-w-0">
              <span className="block font-serif text-[22px] tracking-[-0.01em] whitespace-nowrap text-ink sm:text-[26px]">
                {siteConfig.name}
              </span>
              <span className="mt-[3px] block truncate text-[9.5px] font-bold tracking-[0.28em] text-sage uppercase">
                {siteConfig.tagline}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Store" className="hidden items-center md:flex">
            {NAV.map((entry) => (
              <NavItem key={entry.href} entry={entry} active={isActive(entry)} suffix={wishSuffix(entry)} />
            ))}
          </nav>

          {/* Desktop basket + avatar */}
          {basketButton('hidden md:flex')}
          <span className="hidden md:block">{avatarButton}</span>

          {/* Mobile: compact icon basket (from 360px) + menu button, so the
              full brand name always fits. Below 360px the basket lives in
              the drawer (and still auto-opens when something is added). */}
          <button
            type="button"
            onClick={() => openCart()}
            aria-label={`Open basket${hydrated && cartCount > 0 ? ` (${cartCount} items)` : ''}`}
            className="relative hidden h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center border-none bg-ink text-cream transition-colors min-[360px]:flex hover:bg-pine md:hidden"
          >
            <ShoppingBag className="h-[17px] w-[17px]" />
            {hydrated && cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center bg-pine px-1 text-[10px] font-bold text-cream">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center border-[1.5px] border-ink bg-transparent text-ink transition-colors hover:bg-ink hover:text-cream md:hidden"
          >
            <Menu className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {hydrated &&
        menuOpen &&
        createPortal(
          <div className="fixed inset-0 z-60 md:hidden">
            <div
              className="absolute inset-0 bg-[rgba(18,30,23,0.45)]"
              aria-hidden="true"
              onMouseDown={() => setMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="animate-drawer-in absolute inset-y-0 right-0 flex w-[min(320px,85vw)] flex-col bg-[rgba(243,246,240,0.94)] shadow-[-20px_0_50px_rgba(18,30,23,0.3)] backdrop-blur-[36px] backdrop-saturate-[170%]"
            >
              <div className="flex items-center justify-between border-b border-mist px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5 leading-none">
                  <Image
                    src="/logo-mark.png"
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 object-contain"
                  />
                  <span className="min-w-0">
                    <span className="block font-serif text-[20px] text-ink">{siteConfig.name}</span>
                    <span className="mt-1 block truncate text-[8.5px] font-bold tracking-[0.28em] text-sage uppercase">
                      {siteConfig.tagline}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent text-sage hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav aria-label="Store" className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                {NAV.map((entry) => {
                  const active = isActive(entry);
                  return (
                    <Link
                      key={entry.href}
                      href={entry.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-baseline gap-3 border-l-2 px-4 py-3.5 text-[13px] font-bold tracking-[0.18em] uppercase no-underline transition-colors hover:no-underline',
                        active
                          ? 'border-pine bg-pine/8 text-pine'
                          : 'border-transparent text-ink hover:border-mist hover:text-pine',
                      )}
                    >
                      <span
                        className={cn(
                          'font-serif text-[12px] tracking-normal italic',
                          active ? 'text-gold-deep' : 'text-gold',
                        )}
                      >
                        {entry.index}
                      </span>
                      {entry.label}
                      {wishSuffix(entry)}
                      {active && <span aria-hidden="true" className="ml-auto h-[3px] w-[3px] bg-gold" />}
                    </Link>
                  );
                })}

                {/* Account: avatar row instead of a numbered tab */}
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  aria-current={accountActive ? 'page' : undefined}
                  className={cn(
                    'mt-2 flex items-center gap-3 border-l-2 px-4 py-3 no-underline transition-colors hover:no-underline',
                    accountActive
                      ? 'border-pine bg-pine/8'
                      : 'border-transparent hover:border-mist',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center',
                      signedIn
                        ? 'bg-pine text-[12.5px] font-bold text-cream-bright'
                        : 'border-[1.5px] border-ink text-ink',
                    )}
                  >
                    {signedIn ? initials(customer!.name) : <User className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate text-[13px] font-bold tracking-[0.18em] uppercase',
                        accountActive ? 'text-pine' : 'text-ink',
                      )}
                    >
                      {signedIn ? customer!.name.trim().split(' ')[0] : 'Account'}
                    </span>
                    <span className="block text-[10.5px] font-medium text-sage">
                      {signedIn ? 'Orders, profile & security' : 'Sign in or create an account'}
                    </span>
                  </span>
                </Link>
              </nav>

              <div className="border-t border-mist px-5 py-4">
                {basketButton('flex w-full justify-center')}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
