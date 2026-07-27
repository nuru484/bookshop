// src/app/api/users/[userId]/2fa/setup/route.ts
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
  generateOtpCode,
  issueUserSecurityToken,
  TWO_FACTOR_CODE_TTL_MINUTES,
} from '@/utils/user-security-tokens';
import { sendTwoFactorCodeEmail } from '@/lib/mail/auth-emails';

/**
 * POST /api/users/[userId]/2fa/setup
 * Protected - emails a confirmation code before turning 2FA on (proves the
 * user controls the mailbox). Users can only set up 2FA on their own account.
 */
export async function POST(
  _req: NextRequest,
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullname: true, email: true, twoFactorEnabled: true },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.twoFactorEnabled) {
      throw new BadRequestError('Two-factor authentication is already enabled');
    }

    const code = generateOtpCode();
    await issueUserSecurityToken(
      user.id,
      UserSecurityTokenType.TWO_FACTOR_SETUP,
      code,
      TWO_FACTOR_CODE_TTL_MINUTES,
    );
    await sendTwoFactorCodeEmail(user, code, 'setup');

    return NextResponse.json({
      message: 'A confirmation code has been sent to your email',
    });
  } catch (err) {
    return handleApiError(err);
  }
}
