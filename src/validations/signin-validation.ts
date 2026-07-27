// src/validations/signin-validation.ts
import { z } from 'zod';

export const SigninSchema = z.object({
  email: z.email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(4, { message: 'Password must be at least 4 characters long' })
    .max(500, {
      message: 'Password must be less than 500 characters long.',
    }),
});
