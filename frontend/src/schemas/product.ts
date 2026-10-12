import { z } from 'zod';
import { UNITS } from '../api/types';

// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for the Product form, kept OUTSIDE the component (in schemas/).
// It gives a message for every field. Mirrors the rules of the Mongoose model on the server.
export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters'),
    sku: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{3,20}$/, 'SKU must be 3-20 letters, numbers or dashes'),
    category: z.string().min(1, 'Choose a category'),
    supplier: z.string().min(1, 'Choose a supplier'),
    unit: z.enum(UNITS),
    unitCost: z.number({ error: 'Enter the unit cost' }).min(0, 'Cost cannot be negative'),
    unitPrice: z.number({ error: 'Enter the selling price' }).min(0, 'Price cannot be negative'),
    reorderLevel: z
      .number({ error: 'Enter a reorder level' })
      .int('Use a whole number')
      .min(0, 'Reorder level cannot be negative'),
    openingQuantity: z
      .number({ error: 'Enter the opening stock (0 if none)' })
      .int('Use a whole number')
      .min(0, 'Opening stock cannot be negative'),
    expiryDate: z.string(), // '' means the product does not expire
  })
  // A rule that involves two fields: never sell below cost
  // REQUIREMENT [Core Req 3 - Frontend Application]: cross-field validation - the selling price cannot be lower than the cost (same rule as the server).
  .refine((values) => values.unitPrice >= values.unitCost, {
    path: ['unitPrice'],
    message: 'Selling price cannot be lower than the unit cost',
  });

// The form's TypeScript type comes from the schema, so they can never disagree.
// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer - the form type is generated from the schema, so they can never disagree.
export type ProductFormValues = z.infer<typeof productSchema>;
