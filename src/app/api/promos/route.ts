// src/app/api/promos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/session';
import { requireAdmin, requireStaff } from '@/utils/require-admin';
import { handleApiError, ValidationError, ConflictError } from '@/middlewares/error-handler';
import { z } from 'zod';

const createPromoSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Give it a code of at least 3 characters.')
    .max(30)
    .regex(/^[A-Za-z0-9]+$/, 'Codes are letters and numbers only.')
    .transform((v) => v.toUpperCase()),
  percentOff: z.coerce
    .number()
    .int()
    .min(1, 'Discount must be between 1 and 90%.')
    .max(90, 'Discount must be between 1 and 90%.'),
  description: z.string().trim().max(255).optional().or(z.literal('')),
  genre: z.enum(['Romance', 'Gothic', 'Literary', 'Adventure', 'Epic']).nullable().optional(),
});

/** GET /api/promos - staff: every promotion, newest first. */
export async function GET(): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireStaff(session);
    const promos = await prisma.promo.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ message: 'Promotions retrieved successfully', data: promos });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/promos - admin: create a promotion (live immediately). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await verifySession();
    requireAdmin(session);

    const validation = createPromoSchema.safeParse(await req.json());
    if (!validation.success) {
      throw new ValidationError(validation.error.issues[0]?.message ?? 'Validation failed');
    }
    const input = validation.data;

    const clash = await prisma.promo.findUnique({ where: { code: input.code }, select: { id: true } });
    if (clash) throw new ConflictError(`${input.code} already exists`);

    const promo = await prisma.promo.create({
      data: {
        code: input.code,
        percentOff: input.percentOff,
        description: input.description || 'Shop promotion',
        genre: input.genre ?? null,
        active: true,
      },
    });

    return NextResponse.json({ message: `${promo.code} is live`, data: promo }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
