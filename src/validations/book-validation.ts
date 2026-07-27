// src/validations/book-validation.ts
import { z } from 'zod';

const genre = z.enum(['Romance', 'Gothic', 'Literary', 'Adventure', 'Epic']);
const status = z.enum(['Published', 'Draft', 'Archived']);

export const createBookSchema = z.object({
  title: z.string().trim().min(2, 'Every book needs a title.').max(255),
  author: z.string().trim().min(2, 'And an author.').max(150),
  price: z.coerce.number().positive('Price must be above zero.'),
  stock: z.coerce.number().int().min(0, 'Stock must be 0 or more.'),
  genre,
  status: status.optional(),
  year: z.coerce.number().int().optional(),
  isbn: z.string().trim().max(20).optional().or(z.literal('')),
  blurb: z.string().trim().max(500).optional().or(z.literal('')),
  isNew: z.boolean().optional(),
  staffPick: z.boolean().optional(),
});

export const updateBookSchema = createBookSchema.partial();

export const restockSchema = z.object({
  qty: z.coerce.number().int().min(1).max(500).default(20),
});

export type ICreateBookInput = z.input<typeof createBookSchema>;
export type IUpdateBookInput = z.input<typeof updateBookSchema>;
