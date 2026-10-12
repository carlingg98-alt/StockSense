import { z } from 'zod';
import { REASONS } from '../api/types';

const quantity = z
  .number({ error: 'Enter a quantity' })
  .int('Use a whole number')
  .min(1, 'Quantity must be at least 1');

// Record a sale
// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for recording a sale, outside the component.
export const saleSchema = z.object({
  product: z.string().min(1, 'Choose a product'),
  quantity,
  note: z.string().trim().max(200, 'Keep the note under 200 characters'),
});
// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer.
export type SaleFormValues = z.infer<typeof saleSchema>;

// Restock or write off
export const stockMovementSchema = z
  .object({
    type: z.enum(['restock', 'adjustment']),
    product: z.string().min(1, 'Choose a product'),
    quantity,
    // Optional: only filled in when the purchase cost changed
    unitCost: z.number({ error: 'Enter a number' }).min(0, 'Cost cannot be negative').optional(),
    reason: z.union([z.literal(''), z.enum(REASONS)]),
    note: z.string().trim().max(200, 'Keep the note under 200 characters'),
  })
  // REQUIREMENT [Core Req 3 - Frontend Application]: conditional validation - a reason is required only for write-offs.
  .refine((values) => values.type !== 'adjustment' || values.reason !== '', {
    path: ['reason'],
    message: 'Choose why this stock is being written off',
  });
// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer.
export type StockMovementFormValues = z.infer<typeof stockMovementSchema>;

// Correct the note or date of an existing ledger row
// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for editing a ledger row; the date cannot be in the future.
export const transactionEditSchema = z.object({
  note: z.string().trim().max(200, 'Keep the note under 200 characters'),
  date: z
    .string()
    .min(1, 'Choose a date')
    .refine((value) => new Date(`${value}T00:00:00`).getTime() <= Date.now(), 'Date cannot be in the future'),
});
// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer.
export type TransactionEditValues = z.infer<typeof transactionEditSchema>;
