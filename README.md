# Harmattan Books (bookshop)

Full-stack Next.js 16 bookshop: a public storefront and a staff console
(admin) behind real session auth, implemented from the "Harmattan Books"
Claude Design (Storefront.dc.html + Admin.dc.html). The UI currently runs on
seeded in-memory data (redux); the REST APIs come later and will slot into
the existing RTK Query base slice.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4
- Prisma 7 (`prisma-client` generator → `generated/prisma`) +
  `@prisma/adapter-pg` over `pg`, PostgreSQL
- Admin auth (real): jose HS256 JWT session cookie via server actions in
  `src/lib/auth.ts` (login, email-OTP 2FA, forgot/reset password), Upstash
  rate limiting, Gmail SMTP mail layer, env-gated first-admin seed
- `src/proxy.ts` guards `/admin/*` → redirects to `/login`
- Customer auth (mock, per the design): client-side sign-in on `/account`,
  persisted in localStorage until the customer API exists
- State: Redux Toolkit - `catalog` slice (books/orders/promos/staff, shared
  by storefront + admin so admin edits show everywhere), `shop` slice
  (basket/wishlist/recent searches/customer, persisted), `auth` slice
  (admin user), RTK Query base slice ready for endpoints

## Design system

Fonts: Instrument Serif (display) + Karla (text). Square corners
everywhere. Palette + glass surfaces + button recipes live in
`src/app/globals.css` (`.glass`, `.glass-dashed`, `.input-glass`,
`.btn-primary/dark/outline-*`, `.eyebrow`, color tokens `ink pine sage
gold rust …`).

## UX / SEO infrastructure (khadys-kitchen conventions)

- `src/lib/site.ts` + `src/lib/seo.ts` (`pageMetadata`) - clamped titles,
  canonical, noindex for transactional pages; `sitemap.ts`, `robots.ts`,
  `manifest.ts`, JSON-LD (BookStore + WebSite) in the root layout
- `loading.tsx` skeletons on content routes; `error.tsx`,
  `global-error.tsx`, `not-found.tsx` via `SystemMessage`
- `EmptyState`, `ErrorState`, `Modal` + `ConfirmationDialog` +
  `useConfirm()` for every destructive action, `notify()` toast (the
  design's dark bottom-center bar), `Skeleton` kit, `StatusPill`/
  `StockLevelPill`, `BookCover` with shelf-colored fallback

## Routes

Storefront: `/` `/shop` `/books/[slug]` `/authors/[name]` `/search`
`/wishlist` `/checkout` `/checkout/success` `/account`
Admin (session-gated): `/admin` (dashboard), `/admin/books` (+ `new`,
`[id]`, `[id]/edit`), `/admin/orders` (+ `[id]`), `/admin/customers`
(+ `[email]`), `/admin/staff`, `/admin/inventory`, `/admin/promotions`,
`/admin/settings`, `/admin/profile`
Auth: `/login` (+ 2FA step), `/forgot-password`, `/reset-password`

## Getting started

1. `npm install`
2. Copy `.env.example` → `.env`: `DATABASE_URL`, `SESSION_SECRET`
   (`openssl rand -hex 32`), Upstash creds (required for login - the rate
   limiter runs on every auth action), `ADMIN_*` + `ADMIN_SEED_ENABLED=true`,
   Gmail creds only when 2FA/reset emails are needed
3. `npm run migrate` then `npm run seed` (creates the first admin)
4. `npm run dev` - storefront at `/`, staff console via `/login` → `/admin`

## CI/CD

**`.github/workflows/ci.yml`** runs on every push and pull request to `main`:
installs, generates the Prisma client, validates the schema, applies every
migration to a throwaway Postgres service (proving the release step works),
checks the no-em-dash writing rule, then lints, typechecks and builds. The
build uses placeholder env values, so no secrets are needed for CI.

**`.github/workflows/deploy.yml`** runs after CI passes on `main` (or
manually via workflow dispatch): runs `prisma migrate deploy` against the
production database first, deploys to Vercel with the prebuilt output, then
purges the storefront cache tag so no pre-deploy entry outlives the release.

Repository secrets required for deploys:

| Secret | Used for |
| --- | --- |
| `DATABASE_URL` | production migrations |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel deploy |
| `PRODUCTION_BASE_URL`, `REVALIDATE_SECRET` | post-deploy cache purge |

Runtime env vars (Paystack, Frog SMS, Cloudinary, Upstash, Gmail, session
secret) are configured in the hosting provider, not in CI. See
`.env.example` for the full list.
