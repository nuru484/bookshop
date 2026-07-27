// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { ratelimit } from '@/lib/rate-limit';
import {
  handleApiError,
  ValidationError,
  ConflictError,
  TooManyRequestsError,
} from '@/middlewares/error-handler';
import { signupSchema } from '@/validations/user-validation';
import { BCRYPT_SALT_ROUNDS } from '@/config/constants';
import type { IUser } from '@/types/user.types';

/**
 * POST /api/auth/signup
 * Public - creates a CUSTOMER account and signs it in (session cookie).
 * The role is forced server-side; staff accounts are only ever created by
 * admins or the seed.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';
    const { success } = await ratelimit.limit(`signup:${ip}`);
    if (!success) {
      throw new TooManyRequestsError('Too many signup attempts. Please try again shortly.');
    }

    const body = await req.json();
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError(
        validation.error.issues[0]?.message ?? 'Validation failed',
        {
          code: 'VALIDATION_ERROR',
          context: validation.error.flatten() as unknown as Record<string, unknown>,
        },
      );
    }

    const { fullname, email, password, phone } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictError('An account with this email already exists. Sign in instead.');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        fullname: fullname.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ?? null,
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

    await createSession(user.id, user.role);

    return NextResponse.json(
      { message: 'Welcome to Harmattan Books.', data: user as IUser },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
