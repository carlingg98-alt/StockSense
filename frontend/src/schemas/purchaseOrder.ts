import { z } from 'zod';

// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for the Purchase Order form, kept OUTSIDE the component (in schemas/).
// It gives a message for every field. Mirrors the rules of the Mongoose model on the server.
export const purchaseOrderSchema = z.object({
  supplier: z.string().min(1, 'Choose a supplier'),
  note: z.string().trim().max(200, 'Keep the note under 200 characters'),
  items: z
    .array(
      z.object({
        product: z.string().min(1, 'Choose a product'),
        quantity: z.number({ error: 'Enter a quantity' }).int('Use a whole number').min(1, 'At least 1'),
        unitCost: z.number({ error: 'Enter a cost' }).min(0, 'Cost cannot be negative'),
      })
    )
    .min(1, 'Add at least one item'),
});

// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer - the form type is generated from the schema, so they can never disagree.
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
