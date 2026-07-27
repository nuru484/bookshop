// src/app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '@/middlewares/error-handler';
import { updateUserSchema } from '@/validations/user-validation';
import type { Prisma } from '@/lib/prisma';
import type { IUser } from '@/types/user.types';

/**
 * GET /api/users/[userId]
 * Protected - admins can fetch any user, non-admins only themselves.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const { userId } = await params;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!session.isAdmin && session.userId !== userId) {
      throw new ForbiddenError('You can only view your own profile');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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

/**
 * PUT /api/users/[userId]
 * Protected - users can update their own profile (fullname, email, phone).
 * Only admins may additionally change roles (never their own).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const { userId } = await params;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!session.isAdmin && session.userId !== userId) {
      throw new ForbiddenError('You can only update your own profile');
    }

    const body = await req.json();

    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<string, unknown>,
      });
    }

    const userDetails = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Guard against email collision when email is being changed
    if (userDetails.email && userDetails.email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: userDetails.email },
        select: { id: true },
      });
      if (emailTaken) {
        throw new ConflictError(`A user with email "${userDetails.email}" already exists`);
      }
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (userDetails.fullname !== undefined) updateData.fullname = userDetails.fullname;
    if (userDetails.email !== undefined) updateData.email = userDetails.email;
    if (userDetails.phone !== undefined) updateData.phone = userDetails.phone;
    if (userDetails.address !== undefined) updateData.address = userDetails.address;
    if (userDetails.city !== undefined) updateData.city = userDetails.city;
    // Only admins may change a user's role (prevents self-escalation).
    if (userDetails.role !== undefined && session.isAdmin && session.userId !== userId)
      updateData.role = userDetails.role;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    return NextResponse.json({
      message: 'Profile updated successfully',
      data: updatedUser as IUser,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
