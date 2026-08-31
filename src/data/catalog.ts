// src/data/catalog.ts
// Static seed catalogue. It feeds the redux catalog slice so the whole UI
// renders end-to-end whenever live API data is unavailable.
import { sampleEmail } from '@/lib/site';

export type Genre = 'Romance' | 'Gothic' | 'Literary' | 'Adventure' | 'Epic';

export type BookStatus = 'Published' | 'Draft' | 'Archived';

export interface Book {
  id: number;
  slug: string;
  title: string;
  author: string;
  year: number;
  genre: Genre;
  price: number;
  stock: number;
  rating: number;
  pages: number;
  isbn: string;
  /// Visibility on the storefront; static seeds default to Published.
  status?: BookStatus;
  isNew?: boolean;
  staffPick?: boolean;
  sold: number;
  blurb: string;
}

export type OrderStatus = 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: number;
  qty: number;
}

export interface Order {
  id: string;
  /** Refund trail, present once a cancelled order has been refunded. */
  refundedAt?: string | null;
  refundRef?: string | null;
  refundAmount?: number | null;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  items: OrderItem[];
  status: OrderStatus;
  date: string;
}

export interface Promo {
  code: string;
  off: number;
  desc: string;
  active: boolean;
}

export type StaffRole = 'Owner' | 'Admin' | 'Manager' | 'Fulfilment' | 'Support';

export interface StaffMember {
  name: string;
  email: string;
  role: StaffRole;
  last: string;
  active: boolean;
  you?: boolean;
}

export interface DeviceSession {
  id: number;
  device: string;
  time: string;
  current: boolean;
}

export const GENRES: readonly ['All', ...Genre[]] = ['All', 'Romance', 'Gothic', 'Literary', 'Adventure', 'Epic'];

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_OVER = 250;
export const LOW_STOCK_THRESHOLD = 6;
export const ORDERS_PER_PAGE = 8;

export const BOOKS: Book[] = [
  { id: 1, slug: 'pride-and-prejudice', title: 'Pride and Prejudice', author: 'Jane Austen', year: 1813, genre: 'Romance', price: 95, stock: 24, rating: 4.8, pages: 432, isbn: '9780141439518', isNew: true, staffPick: true, sold: 342, blurb: "Elizabeth Bennet's wit meets Mr. Darcy's pride in the most beloved courtship in English letters - sharp, funny, and quietly radical." },
  { id: 2, slug: 'jane-eyre', title: 'Jane Eyre', author: 'Charlotte Brontë', year: 1847, genre: 'Gothic', price: 110, stock: 18, rating: 4.7, pages: 532, isbn: '9780141441146', sold: 287, blurb: 'An orphan governess with an iron conscience, a brooding master, and a secret locked in the attic at Thornfield Hall.' },
  { id: 3, slug: 'wuthering-heights', title: 'Wuthering Heights', author: 'Emily Brontë', year: 1847, genre: 'Gothic', price: 98, stock: 4, rating: 4.5, pages: 416, isbn: '9780141439556', sold: 198, blurb: 'Love as weather system - Heathcliff and Catherine rage across the Yorkshire moors in the wildest novel of its century.' },
  { id: 4, slug: 'great-expectations', title: 'Great Expectations', author: 'Charles Dickens', year: 1861, genre: 'Literary', price: 120, stock: 15, rating: 4.6, pages: 544, isbn: '9780141439563', sold: 265, blurb: 'Pip, a convict on the marshes, and a fortune with strings attached. Dickens at his most haunted and humane.' },
  { id: 5, slug: 'moby-dick', title: 'Moby-Dick', author: 'Herman Melville', year: 1851, genre: 'Adventure', price: 145, stock: 9, rating: 4.4, pages: 720, isbn: '9780142437247', staffPick: true, sold: 156, blurb: 'A mad captain, a white whale, and everything else in the world besides. The great American cathedral of a novel.' },
  { id: 6, slug: 'frankenstein', title: 'Frankenstein', author: 'Mary Shelley', year: 1818, genre: 'Gothic', price: 88, stock: 30, rating: 4.6, pages: 288, isbn: '9780141439471', isNew: true, sold: 310, blurb: 'Written by a teenager on a dare, still the sharpest question we have about what makers owe the things they make.' },
  { id: 7, slug: 'dracula', title: 'Dracula', author: 'Bram Stoker', year: 1897, genre: 'Gothic', price: 105, stock: 12, rating: 4.5, pages: 488, isbn: '9780141439846', sold: 224, blurb: "Told in letters, diaries and ship's logs - the vampire novel every other vampire novel is still answering." },
  { id: 8, slug: 'the-picture-of-dorian-gray', title: 'The Picture of Dorian Gray', author: 'Oscar Wilde', year: 1890, genre: 'Literary', price: 92, stock: 21, rating: 4.7, pages: 304, isbn: '9780141439570', isNew: true, sold: 276, blurb: "A beautiful young man stays beautiful; his portrait does not. Wilde's only novel, glittering and merciless." },
  { id: 9, slug: 'middlemarch', title: 'Middlemarch', author: 'George Eliot', year: 1871, genre: 'Literary', price: 160, stock: 7, rating: 4.6, pages: 880, isbn: '9780141439549', staffPick: true, sold: 143, blurb: "A whole provincial town, inner lives and all. Often called the greatest English novel - we won't argue." },
  { id: 10, slug: 'crime-and-punishment', title: 'Crime and Punishment', author: 'Fyodor Dostoevsky', year: 1866, genre: 'Literary', price: 135, stock: 14, rating: 4.8, pages: 720, isbn: '9780143058144', sold: 231, blurb: 'One axe, one theory, one long fever of a conscience. St. Petersburg has never felt closer.' },
  { id: 11, slug: 'anna-karenina', title: 'Anna Karenina', author: 'Leo Tolstoy', year: 1878, genre: 'Romance', price: 175, stock: 6, rating: 4.7, pages: 864, isbn: '9780143035008', sold: 187, blurb: "All happy families are alike - and then there's Anna. Tolstoy's grand, devastating portrait of love against society." },
  { id: 12, slug: 'the-odyssey', title: 'The Odyssey', author: 'Homer', year: -800, genre: 'Epic', price: 130, stock: 20, rating: 4.7, pages: 560, isbn: '9780140268867', isNew: true, sold: 298, blurb: 'Ten years of war, ten years of getting home. The original road story, and still the best one.' },
  { id: 13, slug: 'heart-of-darkness', title: 'Heart of Darkness', author: 'Joseph Conrad', year: 1899, genre: 'Adventure', price: 75, stock: 26, rating: 4.2, pages: 128, isbn: '9780141441672', sold: 167, blurb: 'A river journey into the machinery of empire - short, dense, and impossible to shake.' },
  { id: 14, slug: 'little-women', title: 'Little Women', author: 'Louisa May Alcott', year: 1868, genre: 'Romance', price: 100, stock: 16, rating: 4.6, pages: 592, isbn: '9780147514011', sold: 254, blurb: 'Four sisters, one attic full of plays and ambitions. The warmest book on this shelf, and one of the truest.' },
  { id: 15, slug: 'the-count-of-monte-cristo', title: 'The Count of Monte Cristo', author: 'Alexandre Dumas', year: 1844, genre: 'Adventure', price: 190, stock: 11, rating: 4.9, pages: 1276, isbn: '9780140449266', isNew: true, staffPick: true, sold: 203, blurb: 'Wrongly imprisoned, impossibly enriched, exquisitely avenged. The most satisfying 1,200 pages you will ever read.' },
  { id: 16, slug: 'emma', title: 'Emma', author: 'Jane Austen', year: 1815, genre: 'Romance', price: 99, stock: 3, rating: 4.5, pages: 512, isbn: '9780141439587', sold: 176, blurb: "A heroine 'whom no one but myself will much like' - Austen was wrong, and Emma's matchmaking misadventures are pure delight." },
  { id: 17, slug: 'the-brothers-karamazov', title: 'The Brothers Karamazov', author: 'Fyodor Dostoevsky', year: 1880, genre: 'Literary', price: 185, stock: 8, rating: 4.8, pages: 796, isbn: '9780374528379', isNew: true, sold: 134, blurb: "Three brothers, one murdered father, and every large question a novel can hold. Dostoevsky's final masterpiece." },
  { id: 18, slug: 'war-and-peace', title: 'War and Peace', author: 'Leo Tolstoy', year: 1869, genre: 'Epic', price: 220, stock: 5, rating: 4.7, pages: 1392, isbn: '9780140447934', sold: 98, blurb: 'Napoleon invades; five families endure. Less a novel than a second life you get to live.' },
];

export const ORDERS: Order[] = [
  { id: 'HB-2431', name: 'Ama Mensah', email: 'ama.mensah@gmail.com', phone: '024 555 0182', city: 'Accra', address: '14 Oxford St, Osu', items: [{ id: 15, qty: 1 }, { id: 1, qty: 1 }], status: 'Pending', date: '2026-07-26T14:32:00' },
  { id: 'HB-2430', name: 'Kwame Boateng', email: 'kboateng@yahoo.com', phone: '020 555 7741', city: 'Kumasi', address: 'Plot 8, Ahodwo', items: [{ id: 6, qty: 2 }], status: 'Paid', date: '2026-07-25T18:05:00' },
  { id: 'HB-2429', name: 'Efua Owusu', email: 'efua.o@gmail.com', phone: '054 555 3390', city: 'Accra', address: '22 Ring Rd East', items: [{ id: 12, qty: 1 }, { id: 13, qty: 1 }, { id: 8, qty: 1 }], status: 'Paid', date: '2026-07-25T09:41:00' },
  { id: 'HB-2428', name: 'Yaw Darko', email: 'yawdarko@outlook.com', phone: '027 555 9012', city: 'Tema', address: 'Community 5, House 31', items: [{ id: 18, qty: 1 }], status: 'Shipped', date: '2026-07-24T16:20:00' },
  { id: 'HB-2427', name: 'Akosua Asante', email: 'akosua.a@gmail.com', phone: '024 555 6678', city: 'Accra', address: '7 Labone Cres', items: [{ id: 2, qty: 1 }, { id: 3, qty: 1 }], status: 'Shipped', date: '2026-07-23T11:57:00' },
  { id: 'HB-2426', name: 'Kofi Adjei', email: 'kofi.adjei@gmail.com', phone: '055 555 2210', city: 'Takoradi', address: '12 Beach Rd', items: [{ id: 10, qty: 1 }], status: 'Delivered', date: '2026-07-22T20:14:00' },
  { id: 'HB-2425', name: 'Abena Sarpong', email: 'abenas@gmail.com', phone: '026 555 8845', city: 'Accra', address: '3 Kuku Hill, Osu', items: [{ id: 1, qty: 1 }, { id: 16, qty: 1 }, { id: 14, qty: 1 }], status: 'Delivered', date: '2026-07-21T08:26:00' },
  { id: 'HB-2424', name: 'Nana Yeboah', email: 'nyeboah@gmail.com', phone: '024 555 1123', city: 'Cape Coast', address: 'University Ave 9', items: [{ id: 9, qty: 1 }, { id: 17, qty: 1 }], status: 'Delivered', date: '2026-07-20T13:49:00' },
  { id: 'HB-2423', name: 'Esi Quartey', email: 'esi.q@gmail.com', phone: '020 555 4456', city: 'Accra', address: '18 Dzorwulu Rd', items: [{ id: 5, qty: 1 }], status: 'Cancelled', date: '2026-07-19T17:33:00' },
  { id: 'HB-2422', name: 'Kojo Antwi', email: 'kojo.antwi@gmail.com', phone: '054 555 7789', city: 'Accra', address: 'Spintex Rd, Block C', items: [{ id: 7, qty: 2 }, { id: 6, qty: 1 }], status: 'Delivered', date: '2026-07-18T10:08:00' },
  { id: 'HB-2421', name: 'Adwoa Baah', email: 'adwoabaah@gmail.com', phone: '027 555 3341', city: 'Kumasi', address: 'KNUST Campus, Hall 4', items: [{ id: 4, qty: 1 }, { id: 13, qty: 1 }], status: 'Delivered', date: '2026-07-17T15:22:00' },
  { id: 'HB-2420', name: 'Ama Mensah', email: 'ama.mensah@gmail.com', phone: '024 555 0182', city: 'Accra', address: '14 Oxford St, Osu', items: [{ id: 11, qty: 1 }], status: 'Delivered', date: '2026-07-15T19:45:00' },
  { id: 'HB-2419', name: 'Kwabena Osei', email: 'kwabena.osei@gmail.com', phone: '055 555 9987', city: 'Accra', address: '11 Airport Res. Area', items: [{ id: 12, qty: 1 }, { id: 15, qty: 1 }], status: 'Delivered', date: '2026-07-13T12:11:00' },
  { id: 'HB-2418', name: 'Efua Owusu', email: 'efua.o@gmail.com', phone: '054 555 3390', city: 'Accra', address: '22 Ring Rd East', items: [{ id: 8, qty: 1 }], status: 'Delivered', date: '2026-07-11T09:03:00' },
];

export const WEEKS = [
  { w: 'May 10', iso: '2026-05-10', v: 6120 },
  { w: 'May 17', iso: '2026-05-17', v: 7340 },
  { w: 'May 24', iso: '2026-05-24', v: 6890 },
  { w: 'May 31', iso: '2026-05-31', v: 8210 },
  { w: 'Jun 7', iso: '2026-06-07', v: 7960 },
  { w: 'Jun 14', iso: '2026-06-14', v: 9140 },
  { w: 'Jun 21', iso: '2026-06-21', v: 8730 },
  { w: 'Jun 28', iso: '2026-06-28', v: 10280 },
  { w: 'Jul 5', iso: '2026-07-05', v: 9870 },
  { w: 'Jul 12', iso: '2026-07-12', v: 11420 },
  { w: 'Jul 19', iso: '2026-07-19', v: 10960 },
  { w: 'Jul 26', iso: '2026-07-26', v: 12540 },
];

export const FUNNEL = [
  { label: 'Visits', v: 12400 },
  { label: 'Book views', v: 6820 },
  { label: 'Added to cart', v: 1450 },
  { label: 'Purchased', v: 512 },
];

export const PROMOS: Promo[] = [
  { code: 'SEASON15', off: 15, desc: 'Rainy-season sale - 15% off the Gothic shelf', active: true },
  { code: 'FIRSTCHAPTER', off: 10, desc: "10% off a customer's first order", active: true },
  { code: 'BOOKCLUB20', off: 20, desc: 'Book-club bulk orders of 5+ copies', active: false },
];

export const STAFF: StaffMember[] = [
  { name: 'Selasi Amoah', email: sampleEmail('selasi'), role: 'Owner', last: 'Active now', active: true, you: true },
  { name: 'Kwesi Appiah', email: sampleEmail('kwesi'), role: 'Manager', last: 'Active 2h ago', active: true },
  { name: 'Adjoa Mills', email: sampleEmail('adjoa'), role: 'Fulfilment', last: 'Yesterday', active: true },
  { name: 'Yaw Mensimah', email: sampleEmail('yaw'), role: 'Support', last: '3 Jul 2026', active: false },
];

export const CUSTOMER_SESSIONS: DeviceSession[] = [
  { id: 1, device: 'Chrome · MacBook Air', time: 'Osu, Accra - active now', current: true },
  { id: 2, device: 'Safari · iPhone 13', time: 'Accra - 2 days ago', current: false },
  { id: 3, device: 'Chrome · Windows', time: 'Kumasi - 12 Jul 2026', current: false },
];

export const POPULAR_SEARCHES = ['Jane Austen', 'Gothic classics', 'Dostoevsky', 'The Odyssey', 'Adventure'];

/** Open Library cover image for an ISBN. */
export const coverUrl = (isbn: string, size: 'M' | 'L' = 'L'): string =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;

/** Cover-fallback background per shelf. */
const SHELF_COLORS: Record<Genre, string> = {
  Romance: '#8A4A5C',
  Gothic: '#3A4740',
  Literary: '#5A4632',
  Adventure: '#34506B',
  Epic: '#6B4A2F',
};
export const shelfColor = (genre: Genre | string): string =>
  SHELF_COLORS[genre as Genre] ?? '#5A4632';

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
