// src/app/api/users/[userId]/role/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin } from '@/utils/require-admin';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  BadRequestError,
} from '@/middlewares/error-handler';
import { changeUserRoleSchema } from '@/validations/user-validation';
import type { IUser } from '@/types/user.types';

/**
 * PATCH /api/users/[userId]/role
 * Protected, admin only - changes another staff member's role
 * (ADMIN <-> EDITOR). Admins can never change their own role, and
 * customer accounts cannot be promoted here.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);

    const { userId } = await params;
    if (!userId) throw new ValidationError('User ID is required');
    if (session.userId === userId) {
      throw new BadRequestError('You cannot change your own role');
    }

    const body = await req.json();
    const validation = changeUserRoleSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Role must be either ADMIN or EDITOR');
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, fullname: true },
    });
    if (!existing) throw new NotFoundError('User not found');
    if (existing.role === 'CUSTOMER') {
      throw new BadRequestError('Customer accounts cannot be given console roles here');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role: validation.data.role },
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

    return NextResponse.json({
      message: `${user.fullname} is now ${user.role === 'ADMIN' ? 'an Admin' : 'an Editor'}`,
      data: user as IUser,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
