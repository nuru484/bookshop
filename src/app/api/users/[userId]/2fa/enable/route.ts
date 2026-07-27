// src/app/api/users/[userId]/2fa/enable/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma, { UserSecurityTokenType } from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import {
  handleApiError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/middlewares/error-handler';
import {
  verifyUserOtp,
  otpFailureMessage,
} from '@/utils/user-security-tokens';
import { twoFactorCodeSchema } from '@/validations/two-factor-validation';

/**
 * POST /api/users/[userId]/2fa/enable
 * Protected - confirms the setup code emailed by /2fa/setup and flips
 * twoFactorEnabled on. Users can only enable 2FA on their own account.
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
    const validation = twoFactorCodeSchema.safeParse(body);
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
      select: { id: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    const result = await verifyUserOtp(
      user.id,
      UserSecurityTokenType.TWO_FACTOR_SETUP,
      validation.data.code,
    );
    if (!result.ok) {
      throw new BadRequestError(
        otpFailureMessage(result.reason, result.attemptsLeft),
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    return NextResponse.json({
      message: 'Two-factor authentication is now enabled',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
