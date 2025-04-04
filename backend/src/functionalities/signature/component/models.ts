import { z } from 'zod';

// Define the allowed index types
export const SignatureComponentIndexType = z.enum(["dec", "roman", "small_char", "capital_char"]);
export type SignatureComponentIndexType = z.infer<typeof SignatureComponentIndexType>;


export interface SignatureComponent {
    signatureComponentId?: number;
    name: string;
    description?: string | null; // Allow null from DB
    index_count: number; // New field, managed internally
    index_type: SignatureComponentIndexType; // New field, default 'dec'
    createdOn: Date;
    modifiedOn: Date;
    // active: boolean; // Consider adding later for soft deletes
}

// Schema for creation input - index_type optional, index_count not included
export const createSignatureComponentSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
    index_type: SignatureComponentIndexType.optional().default('dec'), // Allow setting type on creation
});

// Schema for update input (index_count not updatable here)
export const updateSignatureComponentSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name too long").optional(),
    description: z.string().max(500, "Description too long").optional().nullable(),
    index_type: SignatureComponentIndexType.optional(), // Allow updating index type
}).partial(); // Make all fields optional for PATCH

export type CreateSignatureComponentInput = z.infer<typeof createSignatureComponentSchema>;
export type UpdateSignatureComponentInput = z.infer<typeof updateSignatureComponentSchema>;