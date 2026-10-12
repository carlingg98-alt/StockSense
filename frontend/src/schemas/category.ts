import { z } from 'zod';

// REQUIREMENT [Core Req 3 - Frontend Application]: Zod schema for the Category form, kept OUTSIDE the component (in schemas/).
// It gives a message for every field. Mirrors the rules of the Mongoose model on the server.
export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(40, 'Name must be at most 40 characters'),
  description: z.string().trim().max(200, 'Keep the description under 200 characters'),
});

// REQUIREMENT [Core Req 3 - Frontend Application]: z.infer - the form type is generated from the schema, so they can never disagree.
export type CategoryFormValues = z.infer<typeof categorySchema>;
