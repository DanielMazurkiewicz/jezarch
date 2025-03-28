import { z } from 'zod';

export interface Tag {
    tagId?: number;
    name: string;
    description?: string; // Optional description
}

// Zod schema for creating/updating a tag
export const tagSchema = z.object({
    name: z.string().min(1, "Tag name cannot be empty").max(50, "Tag name too long"),
    description: z.string().max(255, "Description too long").optional(),
});