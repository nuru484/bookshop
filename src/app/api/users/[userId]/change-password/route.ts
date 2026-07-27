// src/app/api/users/[userId]/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import {
  handleApiError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '@/middlewares/error-handler';
import { changePasswordSchema } from '@/validations/user-validation';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * PATCH /api/users/[userId]/change-password
 * Protected - users can only change their own password.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const session = await verifySession();
    const { userId } = await params;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('You can only change your own password');
    }

    const body = await req.json();

    const validation = changePasswordSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<
          string,
          unknown
        >,
      });
    }

    const { currentPassword, newPassword } = validation.data;

    if (currentPassword === newPassword) {
      throw new BadRequestError(
        'New password cannot be the same as the current password',
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(
      newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (err) {
    return handleApiError(err);
  }
}
