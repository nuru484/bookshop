// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin } from '@/utils/require-admin';
import {
  handleApiError,
  ValidationError,
  ConflictError,
} from '@/middlewares/error-handler';
import { createUserSchema } from '@/validations/user-validation';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import type { IUser, IUsersPaginatedResponse } from '@/types/user.types';
import type { Prisma } from '@/lib/prisma';

/**
 * GET /api/users
 * Protected, admin only - paginated users. ?role=STAFF limits to
 * ADMIN + EDITOR (the staff console list); a specific role also works.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);

    const sp = req.nextUrl.searchParams;
    const page = Math.max(parseInt(sp.get('page') ?? '1') || 1, 1);
    const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '8') || 8, 1), 100);
    const search = sp.get('search') ?? undefined;
    const role = sp.get('role') ?? undefined;

    const where: Prisma.UserWhereInput = {};
    if (role === 'STAFF') where.role = { in: ['ADMIN', 'EDITOR'] };
    else if (role === 'ADMIN' || role === 'EDITOR' || role === 'CUSTOMER') where.role = role;

    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fullname: true,
          email: true,
          phone: true,
          role: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    const response: IUsersPaginatedResponse = {
      message: 'Users retrieved successfully',
      data: users as IUser[],
      meta: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/users
 * Protected, admin only - creates a staff account (ADMIN or EDITOR).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }

    const { fullname, email, password, phone, role } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new ConflictError(`A user with email "${normalizedEmail}" already exists`);
    }

    const user = await prisma.user.create({
      data: {
        fullname,
        email: normalizedEmail,
        password: await bcrypt.hash(password, BCRYPT_SALT_ROUNDS),
        phone: phone ?? null,
        role: role ?? 'EDITOR',
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { message: `${user.fullname} added as ${user.role === 'ADMIN' ? 'Admin' : 'Editor'}`, data: user as IUser },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
