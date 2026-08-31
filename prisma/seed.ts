// prisma/seed.ts
// Purges and reseeds the whole shop with rich, realistic data across every
// module: staff, customers, catalogue, orders (all statuses + refunds),
// promotions, wishlists and search history.
//
// Idempotent by construction: every account is upserted on its unique email,
// so re-running never creates a duplicate person.
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { ENV } from '@/config/env';
import { BOOKS } from '@/data/catalog';
import { sampleEmail } from '@/lib/site';
import type { Genre, OrderStatus } from '@/lib/prisma';

/** Shared password for every seeded account (staff and customers). */
const SEED_PASSWORD = 'ORACLE1995@B9s';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number, hour = 10, minute = 0): Date => {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
};

interface SeedStaff {
  fullname: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'EDITOR';
  twoFactorEnabled?: boolean;
}

interface SeedCustomer {
  fullname: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  /** Days ago the account was created. */
  joined: number;
}

const STAFF: SeedStaff[] = [
  { fullname: 'Selasi Amoah', email: sampleEmail('selasi'), phone: '024 555 0100', role: 'ADMIN', twoFactorEnabled: false },
  { fullname: 'Kwesi Appiah', email: sampleEmail('kwesi'), phone: '020 555 0111', role: 'ADMIN' },
  { fullname: 'Adjoa Mills', email: sampleEmail('adjoa'), phone: '054 555 0122', role: 'EDITOR' },
  { fullname: 'Yaw Mensimah', email: sampleEmail('yaw'), phone: '027 555 0133', role: 'EDITOR' },
];

const CUSTOMERS: SeedCustomer[] = [
  { fullname: 'Ama Mensah', email: 'ama.mensah@gmail.com', phone: '024 555 0182', address: '14 Aboabo Market Road', city: 'Tamale', joined: 210 },
  { fullname: 'Kwame Boateng', email: 'kboateng@yahoo.com', phone: '020 555 7741', address: 'Plot 8, Ahodwo', city: 'Kumasi', joined: 180 },
  { fullname: 'Efua Owusu', email: 'efua.o@gmail.com', phone: '054 555 3390', address: '22 Gumbihini Link', city: 'Tamale', joined: 165 },
  { fullname: 'Yaw Darko', email: 'yawdarko@outlook.com', phone: '027 555 9012', address: 'Community 5, House 31', city: 'Tema', joined: 140 },
  { fullname: 'Akosua Asante', email: 'akosua.a@gmail.com', phone: '024 555 6678', address: '7 Kalpohin Estate', city: 'Tamale', joined: 120 },
  { fullname: 'Kofi Adjei', email: 'kofi.adjei@gmail.com', phone: '055 555 2210', address: '12 Beach Road', city: 'Takoradi', joined: 96 },
  { fullname: 'Abena Sarpong', email: 'abenas@gmail.com', phone: '026 555 8845', address: '3 Vittin Estate', city: 'Tamale', joined: 74 },
  { fullname: 'Nana Yeboah', email: 'nyeboah@gmail.com', phone: '024 555 1123', address: 'University Ave 9', city: 'Cape Coast', joined: 60 },
  { fullname: 'Esi Quartey', email: 'esi.q@gmail.com', phone: '020 555 4456', address: '18 Dzorwulu Road', city: 'Accra', joined: 45 },
  { fullname: 'Kojo Antwi', email: 'kojo.antwi@gmail.com', phone: '054 555 7789', address: 'Sagnarigu Block C', city: 'Tamale', joined: 30 },
  { fullname: 'Adwoa Baah', email: 'adwoabaah@gmail.com', phone: '027 555 3341', address: 'KNUST Campus, Hall 4', city: 'Kumasi', joined: 21 },
  { fullname: 'Kwabena Osei', email: 'kwabena.osei@gmail.com', phone: '055 555 9987', address: '11 Airport Residential', city: 'Accra', joined: 12 },
];

/** Guests who ordered without opening an account. */
const GUESTS = [
  { name: 'Mariama Iddrisu', email: 'mariama.iddrisu@gmail.com', phone: '024 555 4402', address: '5 Lamashegu Road', city: 'Tamale' },
  { name: 'Samuel Nkrumah', email: 'snkrumah@gmail.com', phone: '020 555 6613', address: '9 Ridge Street', city: 'Sunyani' },
];

type OrderPlan = {
  /** Index into CUSTOMERS, or a guest object. */
  who: number | (typeof GUESTS)[number];
  daysAgo: number;
  status: OrderStatus;
  /** Book slugs and quantities. */
  items: [string, number][];
  refunded?: boolean;
};

/**
 * ~9 months of trading, weighted towards recent weeks so the dashboard's
 * range comparisons and weekly chart have a real shape.
 */
const ORDER_PLANS: OrderPlan[] = [
  // Older, all delivered
  { who: 0, daysAgo: 118, status: 'Delivered', items: [['pride-and-prejudice', 1], ['emma', 1]] },
  { who: 1, daysAgo: 112, status: 'Delivered', items: [['frankenstein', 2]] },
  { who: 2, daysAgo: 104, status: 'Delivered', items: [['the-odyssey', 1], ['heart-of-darkness', 1]] },
  { who: 3, daysAgo: 97, status: 'Delivered', items: [['war-and-peace', 1]] },
  { who: 4, daysAgo: 90, status: 'Delivered', items: [['jane-eyre', 1], ['wuthering-heights', 1]] },
  { who: 5, daysAgo: 84, status: 'Delivered', items: [['crime-and-punishment', 1]] },
  { who: 6, daysAgo: 78, status: 'Delivered', items: [['little-women', 1], ['emma', 1]] },
  { who: 0, daysAgo: 72, status: 'Delivered', items: [['anna-karenina', 1]] },
  { who: 7, daysAgo: 66, status: 'Delivered', items: [['middlemarch', 1], ['the-brothers-karamazov', 1]] },
  { who: GUESTS[0], daysAgo: 61, status: 'Delivered', items: [['dracula', 1]] },
  { who: 8, daysAgo: 57, status: 'Cancelled', items: [['moby-dick', 1]], refunded: true },
  { who: 9, daysAgo: 52, status: 'Delivered', items: [['dracula', 2], ['frankenstein', 1]] },
  { who: 10, daysAgo: 47, status: 'Delivered', items: [['great-expectations', 1], ['heart-of-darkness', 1]] },
  { who: 2, daysAgo: 43, status: 'Delivered', items: [['the-picture-of-dorian-gray', 1]] },
  { who: 11, daysAgo: 38, status: 'Delivered', items: [['the-odyssey', 1], ['the-count-of-monte-cristo', 1]] },
  { who: 1, daysAgo: 34, status: 'Delivered', items: [['pride-and-prejudice', 1]] },
  { who: 4, daysAgo: 30, status: 'Delivered', items: [['the-brothers-karamazov', 1]] },
  { who: GUESTS[1], daysAgo: 27, status: 'Delivered', items: [['little-women', 1]] },
  { who: 6, daysAgo: 24, status: 'Delivered', items: [['middlemarch', 1]] },
  { who: 3, daysAgo: 21, status: 'Delivered', items: [['moby-dick', 1], ['the-odyssey', 1]] },
  // Recent fortnight - the live pipeline
  { who: 5, daysAgo: 17, status: 'Delivered', items: [['crime-and-punishment', 1], ['jane-eyre', 1]] },
  { who: 7, daysAgo: 14, status: 'Delivered', items: [['anna-karenina', 1]] },
  { who: 9, daysAgo: 11, status: 'Cancelled', items: [['war-and-peace', 1]], refunded: true },
  { who: 0, daysAgo: 9, status: 'Delivered', items: [['the-picture-of-dorian-gray', 1], ['emma', 1]] },
  { who: 10, daysAgo: 7, status: 'Shipped', items: [['great-expectations', 1]] },
  { who: 2, daysAgo: 5, status: 'Shipped', items: [['the-count-of-monte-cristo', 1], ['pride-and-prejudice', 1]] },
  { who: 8, daysAgo: 4, status: 'Paid', items: [['frankenstein', 1], ['dracula', 1]] },
  { who: 11, daysAgo: 3, status: 'Paid', items: [['wuthering-heights', 1]] },
  { who: 1, daysAgo: 2, status: 'Paid', items: [['the-odyssey', 2]] },
  { who: 4, daysAgo: 1, status: 'Pending', items: [['little-women', 1], ['middlemarch', 1]] },
  { who: GUESTS[0], daysAgo: 0, status: 'Pending', items: [['heart-of-darkness', 1]] },
];

const PROMOS = [
  { code: 'SEASON15', percentOff: 15, description: 'Rainy-season sale - 15% off the Gothic shelf', genre: 'Gothic' as Genre, active: true },
  { code: 'FIRSTCHAPTER', percentOff: 10, description: "10% off a customer's first order", genre: null, active: true },
  { code: 'TAMALE20', percentOff: 20, description: 'Northern Region reading week', genre: null, active: true },
  { code: 'EPICJOURNEY', percentOff: 12, description: '12% off the Epic shelf', genre: 'Epic' as Genre, active: false },
  { code: 'BOOKCLUB20', percentOff: 20, description: 'Book-club bulk orders of 5+ copies', genre: null, active: false },
];

const SEARCH_TERMS: [string, number][] = [
  ['jane austen', 47], ['gothic', 39], ['dostoevsky', 31], ['tolstoy', 26],
  ['the odyssey', 22], ['dickens', 18], ['adventure', 15], ['frankenstein', 12],
  ['emma', 9], ['moby dick', 7], ['bronte', 6], ['war and peace', 4],
];

async function purge(): Promise<void> {
  // Children first - explicit rather than relying on cascade ordering.
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.userSecurityToken.deleteMany();
  await prisma.searchQuery.deleteMany();
  await prisma.promo.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  console.log('Purged: every table is empty.');
}

async function seedUsers(passwordHash: string) {
  // The env admin owns the shop; seeded staff fill out the console.
  const ownerEmail = ENV.ADMIN_EMAIL.toLowerCase().trim();

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    create: {
      email: ownerEmail,
      fullname: ENV.ADMIN_FULLNAME,
      phone: ENV.ADMIN_PHONE ?? '024 555 0000',
      password: passwordHash,
      role: 'ADMIN',
      city: 'Tamale',
      address: 'Aboabo Market Road',
      createdAt: daysAgo(240),
    },
    update: { password: passwordHash, role: 'ADMIN' },
  });

  for (const s of STAFF) {
    if (s.email.toLowerCase() === ownerEmail) continue; // never duplicate the owner
    await prisma.user.upsert({
      where: { email: s.email },
      create: {
        email: s.email,
        fullname: s.fullname,
        phone: s.phone,
        password: passwordHash,
        role: s.role,
        twoFactorEnabled: s.twoFactorEnabled ?? false,
        city: 'Tamale',
        createdAt: daysAgo(200),
      },
      update: { password: passwordHash },
    });
  }

  const customers = new Map<string, string>(); // email -> id
  for (const c of CUSTOMERS) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      create: {
        email: c.email,
        fullname: c.fullname,
        phone: c.phone,
        address: c.address,
        city: c.city,
        password: passwordHash,
        role: 'CUSTOMER',
        createdAt: daysAgo(c.joined),
      },
      update: { password: passwordHash },
    });
    customers.set(c.email, user.id);
  }

  console.log(
    `Users seed: owner ${owner.email}, ${STAFF.length} staff, ${CUSTOMERS.length} customers.`,
  );
  return customers;
}

async function seedBooks() {
  // A couple of deliberate non-published titles so the visibility filter has
  // something to show, and varied stock so inventory has work to do.
  const DRAFTS = new Set(['heart-of-darkness']);
  const ARCHIVED = new Set(['war-and-peace']);
  const STOCK_OVERRIDE: Record<string, number> = {
    'wuthering-heights': 0,
    emma: 2,
    'anna-karenina': 4,
    middlemarch: 5,
    'the-brothers-karamazov': 6,
  };

  const bySlug = new Map<string, number>();
  for (const b of BOOKS) {
    const book = await prisma.book.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug,
        title: b.title,
        author: b.author,
        year: b.year,
        genre: b.genre,
        status: DRAFTS.has(b.slug) ? 'Draft' : ARCHIVED.has(b.slug) ? 'Archived' : 'Published',
        price: b.price,
        stock: STOCK_OVERRIDE[b.slug] ?? b.stock,
        rating: b.rating,
        pages: b.pages,
        isbn: b.isbn,
        isNew: b.isNew ?? false,
        staffPick: b.staffPick ?? false,
        sold: 0, // recomputed from real orders below
        blurb: b.blurb,
      },
      update: {},
    });
    bySlug.set(b.slug, book.id);
  }
  console.log(`Books seed: ${BOOKS.length} titles (2 non-published, 5 low/out of stock).`);
  return bySlug;
}

async function seedOrders(customerIds: Map<string, string>, bookIds: Map<string, number>) {
  let counter = 2400;
  let refunds = 0;

  for (const plan of ORDER_PLANS) {
    const who = typeof plan.who === 'number' ? CUSTOMERS[plan.who] : plan.who;
    const name = 'fullname' in who ? who.fullname : who.name;
    const userId = typeof plan.who === 'number' ? (customerIds.get(who.email) ?? null) : null;

    const lines = plan.items
      .map(([slug, qty]) => {
        const bookId = bookIds.get(slug);
        const seed = BOOKS.find((b) => b.slug === slug);
        return bookId && seed ? { bookId, qty, unitPrice: seed.price } : null;
      })
      .filter((l): l is { bookId: number; qty: number; unitPrice: number } => l !== null);

    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
    const fee = subtotal >= 250 ? 0 : 25;
    const total = subtotal + fee;
    const placedAt = daysAgo(plan.daysAgo, 9 + (counter % 9), (counter * 7) % 60);
    const paid = plan.status !== 'Pending';

    await prisma.order.create({
      data: {
        id: `HB-${++counter}`,
        name,
        email: who.email,
        phone: who.phone,
        city: who.city,
        address: who.address,
        status: plan.status,
        total,
        userId,
        paystackRef: paid ? `HBPS-SEED-${counter}` : null,
        paidAt: paid ? placedAt : null,
        ...(plan.refunded
          ? {
              refundedAt: daysAgo(Math.max(plan.daysAgo - 1, 0)),
              refundRef: `RF-SEED-${counter}`,
              refundAmount: total,
              statusBeforeCancel: 'Paid' as OrderStatus,
            }
          : {}),
        createdAt: placedAt,
        items: { create: lines },
      },
    });
    if (plan.refunded) refunds += 1;

    // Sales counters only count orders that were actually fulfilled/paid.
    if (plan.status !== 'Cancelled' && plan.status !== 'Pending') {
      for (const line of lines) {
        await prisma.book.update({
          where: { id: line.bookId },
          data: { sold: { increment: line.qty } },
        });
      }
    }
  }

  console.log(`Orders seed: ${ORDER_PLANS.length} orders across every status (${refunds} refunded).`);
}

async function seedPromos() {
  for (const promo of PROMOS) {
    await prisma.promo.upsert({ where: { code: promo.code }, create: promo, update: {} });
  }
  console.log(`Promos seed: ${PROMOS.length} codes (3 live, 2 paused).`);
}

async function seedWishlists(customerIds: Map<string, string>, bookIds: Map<string, number>) {
  const picks: [string, string[]][] = [
    ['ama.mensah@gmail.com', ['middlemarch', 'the-brothers-karamazov', 'anna-karenina']],
    ['efua.o@gmail.com', ['dracula', 'frankenstein']],
    ['kojo.antwi@gmail.com', ['the-count-of-monte-cristo']],
    ['abenas@gmail.com', ['emma', 'little-women', 'pride-and-prejudice']],
  ];
  let count = 0;
  for (const [email, slugs] of picks) {
    const userId = customerIds.get(email);
    if (!userId) continue;
    for (const slug of slugs) {
      const bookId = bookIds.get(slug);
      if (!bookId) continue;
      await prisma.wishlistItem.create({ data: { userId, bookId } });
      count += 1;
    }
  }
  console.log(`Wishlist seed: ${count} saved titles across ${picks.length} customers.`);
}

async function seedSearches() {
  for (const [term, count] of SEARCH_TERMS) {
    await prisma.searchQuery.upsert({
      where: { term },
      create: { term, count, lastSearchedAt: daysAgo(Math.floor(Math.random() * 14)) },
      update: {},
    });
  }
  console.log(`Search seed: ${SEARCH_TERMS.length} terms.`);
}

/**
 * Seeding writes straight to Postgres, so the running app's cached
 * catalogue would otherwise keep serving pre-seed data. Best effort: if the
 * app is up and a secret is configured, ask it to purge.
 */
async function purgeStorefrontCache(): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.log('Cache purge skipped (REVALIDATE_SECRET not set). Clear .next/cache if the shop looks stale.');
    return;
  }
  try {
    const res = await fetch(`${ENV.BASE_URL}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: 'books' }),
    });
    console.log(res.ok ? 'Storefront cache purged.' : `Cache purge returned ${res.status}.`);
  } catch {
    console.log('Cache purge skipped (app not reachable). Clear .next/cache if the shop looks stale.');
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  await purge();
  const customerIds = await seedUsers(passwordHash);
  const bookIds = await seedBooks();
  await seedOrders(customerIds, bookIds);
  await seedPromos();
  await seedWishlists(customerIds, bookIds);
  await seedSearches();

  await purgeStorefrontCache();

  console.log(`\nEvery seeded account uses the password: ${SEED_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('Seed failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
