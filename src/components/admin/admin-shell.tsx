// src/components/admin/admin-shell.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LogOut, PanelLeft, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { userLoggedOut } from '@/redux/auth-slice';
import { logout } from '@/lib/auth';
import { useConfirm } from '@/hooks/use-confirm';
import { useHydrated } from '@/hooks/use-hydrated';
import { useIsMobile } from '@/hooks/use-mobile';
import { initials } from '@/lib/format';
import { notify } from '@/lib/notify';
import { siteConfig } from '@/lib/site';
import { LOW_STOCK_THRESHOLD } from '@/data/catalog';

const NAV: { href: string; label: string; key: string }[] = [
  { href: '/admin', label: 'Dashboard', key: 'dash' },
  { href: '/admin/books', label: 'Books', key: 'books' },
  { href: '/admin/orders', label: 'Orders', key: 'orders' },
  { href: '/admin/customers', label: 'Customers', key: 'customers' },
  { href: '/admin/staff', label: 'Staff', key: 'staff' },
  { href: '/admin/inventory', label: 'Inventory', key: 'inventory' },
  { href: '/admin/promotions', label: 'Promotions', key: 'promos' },
];

/** Which nav key is active for the current pathname. */
function activeKey(pathname: string): string {
  if (pathname === '/admin') return 'dash';
  if (pathname.startsWith('/admin/books')) return 'books';
  if (pathname.startsWith('/admin/orders')) return 'orders';
  if (pathname.startsWith('/admin/customers')) return 'customers';
  if (pathname.startsWith('/admin/staff')) return 'staff';
  if (pathname.startsWith('/admin/inventory')) return 'inventory';
  if (pathname.startsWith('/admin/promotions')) return 'promos';
  if (pathname.startsWith('/admin/profile')) return 'profile';
  return '';
}

/**
 * The profile block at the sidebar bottom - a drop-up menu with My profile,
 * Back to site and Sign out. Closes on outside click, Escape and item click.
 */
function ProfileMenu({
  onNavigate,
  onSignOut,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const hydrated = useHydrated();
  const authUser = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = hydrated && authUser?.fullname ? authUser.fullname : 'Selasi Amoah';
  const roleLabel = hydrated && authUser?.role === 'EDITOR' ? 'Editor' : 'Owner';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const itemCls =
    'flex w-full items-center gap-2.5 border-none bg-transparent px-4 py-2.5 text-left text-[13px] font-semibold text-pale/90 no-underline cursor-pointer hover:bg-pale/10 hover:text-pale hover:no-underline';

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div className="absolute right-0 bottom-full left-0 z-10 mb-2 border border-pale/20 bg-ink shadow-[0_-10px_30px_rgba(18,30,23,0.45)]">
          <Link
            href="/admin/profile"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={itemCls}
          >
            My profile
          </Link>
          <Link
            href="/"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={itemCls}
          >
            ← Back to site
          </Link>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className={`${itemCls} border-t border-pale/15 text-gold hover:text-gold`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-left hover:opacity-85"
      >
        {hydrated && authUser?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
          <img
            src={authUser.profilePicture}
            alt={displayName}
            className="h-8 w-8 shrink-0 object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-pine text-[13px] font-bold text-cream-bright">
            {initials(displayName)}
          </span>
        )}
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[13px] font-bold text-pale">{displayName}</span>
          <span className="block truncate text-[11px] text-pale/55">{roleLabel} · Account</span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-[10px] text-pale/60">
          {open ? '▾' : '▴'}
        </span>
      </button>
    </div>
  );
}

/** The sidebar's inner content - shared by the fixed desktop rail and the mobile drawer. */
function SidebarContent({
  onNavigate,
  onSignOut,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const orders = useAppSelector((s) => s.catalog.orders);
  const books = useAppSelector((s) => s.catalog.books);

  const active = activeKey(pathname);
  const pendCount = orders.filter((o) => o.status === 'Pending' || o.status === 'Paid').length;
  const lowCount = books.filter((b) => b.stock <= LOW_STOCK_THRESHOLD).length;

  const badgeFor = (key: string): string => {
    if (key === 'orders' && pendCount) return String(pendCount);
    if (key === 'inventory' && lowCount) return String(lowCount);
    return '';
  };

  return (
    <div className="flex h-full w-full flex-col bg-ink text-pale">
      <div className="flex items-center gap-2.5 border-b border-pale/12 px-5 pt-[22px] pb-[18px]">
        {/* Light variant: the navy wordmark would disappear on ink. */}
        <Image
          src="/logo-mark-light.png"
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="truncate font-serif text-[21px]">{siteConfig.name}</div>
          <div className="mt-1 text-[9px] font-bold tracking-[0.26em] text-gold uppercase">
            Staff console
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {NAV.map((item) => {
          const isActive = active === item.key;
          const badge = badgeFor(item.key);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center justify-between gap-2 px-3 py-2.5 text-[13.5px] font-semibold no-underline hover:no-underline"
              style={{
                background: isActive ? '#2E6B4F' : 'transparent',
                color: isActive ? '#F1F6EF' : 'rgba(231,237,228,.85)',
              }}
            >
              <span>{item.label}</span>
              {badge && (
                <span
                  className="px-[7px] py-0.5 text-[10.5px] font-bold text-ink"
                  style={{ background: item.key === 'inventory' ? '#C2A65A' : '#E7EDE4' }}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-pale/12 px-5 py-4">
        <ProfileMenu onNavigate={onNavigate} onSignOut={onSignOut} />
      </div>
    </div>
  );
}

const SIDEBAR_WIDTH = 224;
const DRAWER_WIDTH = 288; // 18rem, the mobile sheet width

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();
  const { confirm, dialog } = useConfirm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const onSignOut = () =>
    confirm({
      title: 'Sign out of the staff console?',
      description: 'You will need your password (and 2FA code, if enabled) to sign back in.',
      confirmText: 'Sign out',
      onConfirm: async () => {
        await logout();
        dispatch(userLoggedOut());
        notify('Signed out. See you soon.');
        router.push('/login');
      },
    });

  // Close the drawer on any route change (belt to the per-link braces) -
  // adjust-during-render pattern, no effect needed.
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }

  // Escape closes; body scroll locks while open; focus returns to the trigger.
  useEffect(() => {
    if (!drawerOpen) return;
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: permanently visible sidebar - spacer reserves the width, the
          rail itself is fixed full-height. Not closeable by design. */}
      <div className="hidden md:block">
        <div style={{ width: SIDEBAR_WIDTH }} className="h-px" aria-hidden="true" />
        <aside
          className="fixed inset-y-0 left-0 z-30"
          style={{ width: SIDEBAR_WIDTH }}
          aria-label="Admin navigation"
        >
          <SidebarContent onSignOut={onSignOut} />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 bg-ink px-3.5 py-3 text-pale md:hidden">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border border-pale/25 bg-transparent text-pale hover:border-gold hover:text-gold"
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </button>
          <Image
            src="/logo-mark-light.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <div className="truncate font-serif text-[17px] leading-tight">{siteConfig.name}</div>
            <div className="truncate text-[8.5px] font-bold tracking-[0.26em] text-gold uppercase">
              Staff console
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-3.5 pt-[18px] pb-12 md:px-8 md:pt-7 md:pb-[60px]">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {isMobile && drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[rgba(18,30,23,0.45)] animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex shadow-[20px_0_50px_rgba(18,30,23,0.3)] animate-in slide-in-from-left duration-200"
            style={{ width: DRAWER_WIDTH, maxWidth: '88vw' }}
          >
            <SidebarContent onNavigate={() => setDrawerOpen(false)} onSignOut={onSignOut} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-3 flex h-8 w-8 cursor-pointer items-center justify-center border-none bg-transparent text-pale/70 hover:text-pale"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
