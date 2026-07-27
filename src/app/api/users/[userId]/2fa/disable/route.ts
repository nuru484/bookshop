// src/app/api/users/[userId]/2fa/disable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import {
  handleApiError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '@/middlewares/error-handler';
import { clearTwoFactorTokens } from '@/utils/user-security-tokens';
import { twoFactorDisableSchema } from '@/validations/two-factor-validation';

/**
 * POST /api/users/[userId]/2fa/disable
 * Protected - turning 2FA off requires the current password. Users can only
 * disable 2FA on their own account.
 */
export async function POST(
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
      throw new ForbiddenError(
        'You can only manage two-factor authentication on your own account',
      );
    }

    const body = await req.json();
    const validation = twoFactorDisableSchema.safeParse(body);
    if (!validation.success) {
      throw new ValidationError('Validation failed', {
        code: 'VALIDATION_ERROR',
        context: validation.error.flatten() as unknown as Record<
          string,
          unknown
        >,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (!user.twoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is not enabled');
    }

    const isPasswordValid = await bcrypt.compare(
      validation.data.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedError('Incorrect password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });
    await clearTwoFactorTokens(user.id);

    return NextResponse.json({
      message: 'Two-factor authentication has been disabled',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
