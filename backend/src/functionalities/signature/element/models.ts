import { z } from 'zod';
import { SignatureComponent } from '../component/models'; // Import component model

export interface SignatureElement {
    signatureElementId?: number;
    signatureComponentId: number;
    name: string;
    description?: string | null; // Allow null from DB
    index?: string | null; // New text field
    createdOn: Date;
    modifiedOn: Date;
    // active: boolean; // Consider adding later

    // Optional, populated fields
    component?: SignatureComponent;
    parentElements?: SignatureElement[];
    // childElements?: SignatureElement[]; // Could add if needed
}


// Schema for creation input
export const createSignatureElementSchema = z.object({
    signatureComponentId: z.number().int().positive("Invalid Component ID"),
    name: z.string().min(1, "Name cannot be empty").max(100, "Name too long"),
    description: z.string().max(500, "Description too long").optional(),
    index: z.string().max(255, "Index too long").optional(), // Max length for index
    parentIds: z.array(z.number().int().positive()).optional().default([]), // Array of parent element IDs
});

// Schema for update input (componentId usually shouldn't change, parents can)
export const updateSignatureElementSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name too long").optional(),
    description: z.string().max(500, "Description too long").optional().nullable(), // Allow setting to null
    index: z.string().max(255, "Index too long").optional().nullable(), // Allow setting index to null
    parentIds: z.array(z.number().int().positive()).optional(), // Allow updating parents
    // active: z.boolean().optional(), // If soft delete is added
});


export type CreateSignatureElementInput = z.infer<typeof createSignatureElementSchema>;
export type UpdateSignatureElementInput = z.infer<typeof updateSignatureElementSchema>;

// Interface for search results potentially including parents
export interface SignatureElementSearchResult extends SignatureElement {
     parentIds?: number[]; // Include raw parent IDs in search results if helpful
}