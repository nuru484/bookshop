// src/app/api/users/[userId]/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import {
  handleApiError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from '@/middlewares/error-handler';
import { isValidBase64Image } from '@/utils/validate-base64-image';
import { uploadAvatar, destroyImage } from '@/lib/cloudinary';
import type { IUser } from '@/types/user.types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5MB decoded

const USER_SELECT = {
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
} as const;

const guard = async (userId: string) => {
  const session = await verifySession();
  if (!userId) throw new ValidationError('User ID is required');
  if (session.userId !== userId) {
    throw new ForbiddenError('You can only manage your own profile picture');
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, profilePictureId: true },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
};

/**
 * POST /api/users/[userId]/avatar { image: base64 data URL }
 * Protected, self only - uploads to Cloudinary, replacing any old asset.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const existing = await guard(userId);

    const body = (await req.json()) as { image?: string };
    const image = body.image ?? '';
    if (!isValidBase64Image(image)) {
      throw new BadRequestError('Upload a JPEG, PNG or WebP image');
    }
    // Base64 expands ~4/3 over the raw bytes.
    if (image.length > (MAX_IMAGE_BYTES * 4) / 3) {
      throw new BadRequestError('Image must be under 5MB');
    }

    const uploaded = await uploadAvatar(image, userId);
    // Same public_id (overwrite) - but destroy a differing stale asset.
    if (existing.profilePictureId && existing.profilePictureId !== uploaded.publicId) {
      void destroyImage(existing.profilePictureId);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: uploaded.url, profilePictureId: uploaded.publicId },
      select: USER_SELECT,
    });

    return NextResponse.json({ message: 'Profile picture updated', data: user as IUser });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/users/[userId]/avatar
 * Protected, self only - removes the picture and destroys the asset.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  try {
    const { userId } = await params;
    const existing = await guard(userId);

    if (existing.profilePictureId) void destroyImage(existing.profilePictureId);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null, profilePictureId: null },
      select: USER_SELECT,
    });

    return NextResponse.json({ message: 'Profile picture removed', data: user as IUser });
  } catch (err) {
    return handleApiError(err);
  }
}
