// src/validations/user-validation.ts
import { z } from 'zod';

const fullname = z
  .string()
  .min(1, 'Full name is required')
  .max(100, 'Full name can only be up to 100 characters');

const email = z
  .email('Invalid email address')
  .max(255, 'Email can only be up to 255 characters');

const phone = z
  .string()
  .min(6, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .optional()
  .nullable();

const password = z
  .string()
  .min(5, 'Password must be at least 5 characters')
  .max(255)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character',
  );

/** Public customer signup - role is never accepted from the client. */
export const signupSchema = z.object({
  fullname,
  email,
  password,
  phone,
});

export const createUserSchema = z.object({
  fullname,
  email,
  password,
  phone,
  role: z.enum(['ADMIN', 'EDITOR']).optional(),
});

const address = z.string().trim().max(255).optional().nullable();
const city = z.string().trim().max(100).optional().nullable();

/**
 * Profile updates never carry a role: role changes go through
 * PATCH /api/users/[userId]/role, which enforces not-self and
 * not-a-customer. Keeping it out here means there is exactly one path.
 */
export const updateUserSchema = z.object({
  fullname: fullname.optional(),
  email: email.optional(),
  phone,
  address,
  city,
});

/** Admin-side "create a customer account" form. */
export const adminCreateCustomerSchema = z.object({
  fullname,
  email,
  password,
  phone,
  address,
  city,
});

export const changeUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR'], {
    message: 'Role must be either ADMIN or EDITOR',
  }),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(5, 'Current password must be at least 5 characters')
    .max(255),
  newPassword: z
    .string()
    .min(5, 'New password must be at least 5 characters')
    .max(255)
    .regex(/[A-Z]/, 'New password must contain an uppercase letter')
    .regex(/[a-z]/, 'New password must contain a lowercase letter')
    .regex(/[0-9]/, 'New password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'New password must contain a special character'),
});

export type ICreateUserSchema = z.input<typeof createUserSchema>;
export type IUpdateUserSchema = z.input<typeof updateUserSchema>;
export type IChangeUserRoleSchema = z.input<typeof changeUserRoleSchema>;
export type IChangePasswordSchema = z.input<typeof changePasswordSchema>;
