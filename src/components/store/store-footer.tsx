// src/components/store/store-footer.tsx
import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/site';

const FOOT_LINK =
  'bg-transparent border-none text-pale cursor-pointer text-left p-0 text-sm font-medium no-underline hover:text-pine hover:no-underline';

export function StoreFooter() {
  return (
    <footer className="mt-auto bg-ink text-pale">
      <div className="mx-auto flex max-w-[1180px] flex-wrap gap-10 px-5 pt-12 pb-[30px]">
        <div className="flex-[2_1_260px]">
          <div className="mb-2.5 flex items-center gap-3">
            {/* Light variant: the navy wordmark would disappear on ink. */}
            <Image
              src="/logo-mark-light.png"
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 object-contain"
            />
            <span className="font-serif text-2xl">{siteConfig.name}</span>
          </div>
          <p className="m-0 max-w-[38ch] text-[13.5px] leading-[1.7] text-pale/65">
            {siteConfig.blurb}
          </p>
        </div>
        <div className="flex-[1_1_140px]">
          <div className="mb-3 text-[11px] font-bold tracking-[0.22em] text-pale/50 uppercase">Shop</div>
          <div className="flex flex-col gap-2 text-sm font-medium">
            <Link href="/shop" className={FOOT_LINK}>
              All books
            </Link>
            <Link href="/wishlist" className={FOOT_LINK}>
              Wishlist
            </Link>
            <Link href="/track-order" className={FOOT_LINK}>
              Track order
            </Link>
            <Link href="/account" className={FOOT_LINK}>
              My account
            </Link>
          </div>
        </div>
        <div className="flex-[1_1_230px]">
          <div className="mb-3 text-[11px] font-bold tracking-[0.22em] text-pale/50 uppercase">Visit us</div>
          <div className="text-[13.5px] leading-[1.8] whitespace-nowrap text-pale/75">
            {siteConfig.address}
            <br />
            {siteConfig.city}, {siteConfig.region}
            <br />
            {siteConfig.country}
            <br />
            {siteConfig.openingHours}
            <br />
            {siteConfig.email}
          </div>
        </div>
      </div>
      <div className="border-t border-pale/12">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-5 gap-y-2 px-5 py-4 text-xs text-pale/45">
          <span className="whitespace-nowrap">
            © {siteConfig.copyrightYear} {siteConfig.name}
          </span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy"
              className="whitespace-nowrap text-pale/60 no-underline hover:text-pine hover:no-underline"
            >
              Privacy policy
            </Link>
            <Link
              href="/terms"
              className="whitespace-nowrap text-pale/60 no-underline hover:text-pine hover:no-underline"
            >
              Terms of service
            </Link>
            <Link
              href="/admin"
              className="whitespace-nowrap text-pale/60 no-underline hover:text-pine hover:no-underline"
            >
              Staff console →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
