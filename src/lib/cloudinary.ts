// src/lib/cloudinary.ts
// Cloudinary avatar storage - upload/replace/destroy, mirroring the hardened
// mhp pattern: validate before upload, always destroy the old asset.
import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { ENV } from '@/config/env';
import { InternalServerError } from '@/middlewares/error-handler';
import logger from '@/utils/logger';

let configured = false;
const ensureConfigured = (): void => {
  if (!ENV.CLOUDINARY_CLOUD_NAME || !ENV.CLOUDINARY_API_KEY || !ENV.CLOUDINARY_API_SECRET) {
    throw new InternalServerError(
      'Image uploads are not configured: set the CLOUDINARY_* environment variables.',
    );
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
      api_key: ENV.CLOUDINARY_API_KEY,
      api_secret: ENV.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

export interface IUploadedImage {
  url: string;
  publicId: string;
}

/** Uploads a base64 data-URL avatar, squared at 512px. */
export const uploadAvatar = async (dataUrl: string, userId: string): Promise<IUploadedImage> => {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: 'bookshop/avatars',
    public_id: `user-${userId}`,
    overwrite: true,
    invalidate: true,
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
};

/** Best-effort destroy - a failed cleanup never blocks the main flow. */
export const destroyImage = async (publicId: string): Promise<void> => {
  try {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    logger.warn({ error, publicId }, 'Failed to destroy Cloudinary asset');
  }
};
