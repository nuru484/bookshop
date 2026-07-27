// src/app/(store)/layout.tsx
import { BOOKS, type Book } from '@/data/catalog';
import { getBooksCached } from '@/lib/catalog-data';
import { CatalogHydrator } from '@/components/store/catalog-hydrator';
import { CartUiProvider } from '@/components/store/cart-ui';
import { CartDrawer } from '@/components/store/cart-drawer';
import { StoreHeader } from '@/components/store/store-header';
import { StoreFooter } from '@/components/store/store-footer';
import { AnnouncementPopup } from '@/components/store/announcement-popup';

/**
 * The storefront is static between purges: the catalogue read below is
 * cached under the "books" tag, and every admin mutation revalidates that
 * tag plus this layout's path. Nothing here reads cookies or headers, so
 * these routes prerender and stay served from cache until a book changes.
 */
export const revalidate = false;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  let books: Book[];
  try {
    books = await getBooksCached();
  } catch {
    // DB unavailable (e.g. building without one) - fall back to the seed list.
    books = BOOKS;
  }

  return (
    <CatalogHydrator books={books}>
      <CartUiProvider>
        <div className="flex min-h-screen flex-col text-ink">
          <StoreHeader />
          <main className="mx-auto w-full max-w-[1180px] flex-1 px-5">{children}</main>
          <StoreFooter />
          <CartDrawer />
          <AnnouncementPopup />
        </div>
      </CartUiProvider>
    </CatalogHydrator>
  );
}
