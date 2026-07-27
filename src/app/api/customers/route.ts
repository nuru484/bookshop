// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin, requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError, ConflictError } from '@/middlewares/error-handler';
import { adminCreateCustomerSchema } from '@/validations/user-validation';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import type { IUser } from '@/types/user.types';

export interface ICustomerSummary {
  name: string;
  email: string;
  phone: string;
  city: string;
  count: number;
  spent: number;
  last: string; // ISO datetime of last order ('' when none)
  hasAccount: boolean;
  userId?: string;
  since?: string; // account creation date
}

/**
 * GET /api/customers
 * Protected (staff) - customers derived from orders (guests included) merged
 * with CUSTOMER accounts that may not have ordered yet.
 * ?page&limit&search&city&from&to&sort=spent|count|last&dir
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page') ?? '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '8') || 8, 1), 100);
    const search = sp.get('search')?.trim().toLowerCase();
    const city = sp.get('city') ?? undefined;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;
    const sort = sp.get('sort') ?? 'spent';
    const dir = sp.get('dir') === 'asc' ? 1 : -1;

    const [orders, accounts] = await Promise.all([
      prisma.order.findMany({
        select: { name: true, email: true, phone: true, city: true, status: true, total: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        select: { id: true, fullname: true, email: true, phone: true, city: true, createdAt: true },
      }),
    ]);

    const byEmail = new Map<string, ICustomerSummary>();
    for (const o of orders) {
      const key = o.email.toLowerCase();
      const cur = byEmail.get(key) ?? {
        name: o.name,
        email: o.email,
        phone: o.phone,
        city: o.city,
        count: 0,
        spent: 0,
        last: '',
        hasAccount: false,
      };
      cur.count += 1;
      if (o.status !== 'Cancelled') cur.spent += o.total;
      const iso = o.createdAt.toISOString();
      if (iso > cur.last) {
        cur.last = iso;
        cur.name = o.name;
        cur.city = o.city;
        cur.phone = o.phone;
      }
      byEmail.set(key, cur);
    }
    for (const account of accounts) {
      const key = account.email.toLowerCase();
      const cur = byEmail.get(key);
      if (cur) {
        cur.hasAccount = true;
        cur.userId = account.id;
        cur.since = account.createdAt.toISOString();
        cur.name = account.fullname;
      } else {
        byEmail.set(key, {
          name: account.fullname,
          email: account.email,
          phone: account.phone ?? '',
          city: account.city ?? '',
          count: 0,
          spent: 0,
          last: '',
          hasAccount: true,
          userId: account.id,
          since: account.createdAt.toISOString(),
        });
      }
    }

    let customers = [...byEmail.values()];
    if (search) {
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.city.toLowerCase().includes(search),
      );
    }
    if (city && city !== 'All') customers = customers.filter((c) => c.city === city);
    if (from) customers = customers.filter((c) => c.last && c.last.slice(0, 10) >= from);
    if (to) customers = customers.filter((c) => c.last && c.last.slice(0, 10) <= to);

    customers.sort((a, b) => {
      const value =
        sort === 'count'
          ? a.count - b.count
          : sort === 'last'
            ? a.last.localeCompare(b.last)
            : sort === 'name'
              ? a.name.localeCompare(b.name)
              : a.spent - b.spent;
      return value * dir;
    });

    const total = customers.length;
    const cities = [...new Set([...byEmail.values()].map((c) => c.city).filter(Boolean))].sort();

    return NextResponse.json({
      message: 'Customers retrieved successfully',
      data: customers.slice((page - 1) * limit, page * limit),
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
      cities,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/customers
 * Protected (admin) - creates a CUSTOMER account on a customer's behalf.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);

    const body = await req.json();
    const validation = adminCreateCustomerSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }

    const { fullname, email, password, phone, address, city } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) throw new ConflictError(`An account with email "${normalizedEmail}" already exists`);

    const user = await prisma.user.create({
      data: {
        fullname: fullname.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
        phone: phone ?? null,
        address: address ?? null,
        city: city ?? null,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        profilePicture: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { message: `Account created for ${user.fullname}`, data: user as IUser },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
