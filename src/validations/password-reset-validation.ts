// src/validations/password-reset-validation.ts
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address').max(255),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(32, 'Invalid or incomplete reset link')
    .max(255, 'Invalid or incomplete reset link'),
  password: z
    .string()
    .min(5, 'Password must be at least 5 characters')
    .max(255)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});
