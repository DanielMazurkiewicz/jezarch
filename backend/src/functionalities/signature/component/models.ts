import { z } from 'zod';

export interface SignatureComponent {
    signatureComponentId?: number;
    name: string;
    description?: string | null; // Allow null from DB
    createdOn: Date;
    modifiedOn: Date;
    // active: boolean; // Consider adding later for soft deletes
}

// Schema for creation input
export const createSignatureComponentSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
});

// Schema for update input (all fields optional)
export const updateSignatureComponentSchema = createSignatureComponentSchema.partial();

export type CreateSignatureComponentInput = z.infer<typeof createSignatureComponentSchema>;
export type UpdateSignatureComponentInput = z.infer<typeof updateSignatureComponentSchema>;