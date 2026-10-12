import { z } from 'zod';

// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for the Supplier form, kept OUTSIDE the component (in schemas/).
// It gives a message for every field. Mirrors the rules of the Mongoose model on the server.
export const supplierSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters'),
  contactPerson: z.string().trim().min(1, 'Enter a contact person').max(80, 'Keep it under 80 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-() ]{7,20}$/, 'Enter a valid phone number'),
  email: z.union([z.literal(''), z.email('Enter a valid email address')]),
  leadTimeDays: z
    .number({ error: 'Enter the delivery lead time in days' })
    .int('Use whole days')
    .min(0, 'Lead time cannot be negative')
    .max(90, 'Lead time cannot be more than 90 days'),
  isActive: z.boolean(),
});

// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer - the form type is generated from the schema, so they can never disagree.
export type SupplierFormValues = z.infer<typeof supplierSchema>;
