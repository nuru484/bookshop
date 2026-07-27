// src/validations/two-factor-validation.ts
import { z } from 'zod';

export const twoFactorCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, 'Your password is required'),
});
