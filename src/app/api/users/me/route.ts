// src/app/api/users/me/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { handleApiError, NotFoundError } from '@/middlewares/error-handler';
import type { IUser } from '@/types/user.types';

/**
 * GET /api/users/me
 * Protected - returns the signed-in user's own profile (id from the session
 * cookie, so it works even when client-side state has been cleared).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
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

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return NextResponse.json({
      message: 'User retrieved successfully',
      data: user as IUser,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
