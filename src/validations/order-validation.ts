// src/validations/order-validation.ts
import { z } from 'zod';

export const checkoutSchema = z.object({
  name: z.string().trim().min(2, 'Please tell us your full name.').max(150),
  email: z.email("That email doesn't look right.").max(255),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a valid phone number.'),
  address: z.string().trim().min(5, 'We need a full delivery address.').max(255),
  city: z.string().trim().min(2, 'Which city or town?').max(100),
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Your basket is empty.'),
  promoCode: z.string().trim().max(30).optional().or(z.literal('')),
});

export const trackOrderSchema = z.object({
  orderId: z
    .string()
    .trim()
    .regex(/^HB-\d{3,}$/i, 'Order IDs look like HB-2431.'),
  contact: z.string().trim().min(3, 'Enter the email or phone used on the order.').max(255),
});

export const orderStatusSchema = z.object({
  action: z.enum(['advance', 'set', 'cancel', 'reinstate']),
  /** Required with action "set". */
  status: z.enum(['Pending', 'Paid', 'Shipped', 'Delivered']).optional(),
});

/** Admin-created order (walk-in / phone order) placed on a customer's behalf. */
export const adminOrderSchema = z.object({
  name: z.string().trim().min(2, 'Customer name is required.').max(150),
  email: z.email('Enter a valid email.').max(255),
  phone: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, '').length >= 9, 'Enter a valid phone number.'),
  address: z.string().trim().min(5, 'Delivery address is required.').max(255),
  city: z.string().trim().min(2, 'City or town is required.').max(100),
  items: z
    .array(z.object({ id: z.number().int().positive(), qty: z.number().int().min(1).max(99) }))
    .min(1, 'Add at least one title.'),
  promoCode: z.string().trim().max(30).optional().or(z.literal('')),
  /** How the shop was paid; drives the starting status. */
  status: z.enum(['Pending', 'Paid']).default('Paid'),
});

export type ICheckoutInput = z.input<typeof checkoutSchema>;
