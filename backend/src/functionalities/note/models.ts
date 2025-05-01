import { Tag } from '../tag/models'; // Import Tag model
import { z } from 'zod'; // Import Zod

export interface Note {
  noteId?: number;
  title: string;
  content: string; // Stored as TEXT, which can be empty string. Nulls handled on input/output.
  shared: boolean;
  ownerUserId: number;
  createdOn: Date;
  modifiedOn: Date;
}

// Extended interface including populated fields
export interface NoteWithDetails extends Note {
  tags?: Tag[]; // Add tags array (populated on retrieval)
  ownerLogin?: string; // Add owner's login name (populated on retrieval)
}


// Input for creating/updating a note - Removed extends Omit
export interface NoteInput {
    title: string;
    content?: string | null; // Allow null content from input
    shared: boolean;
    tagIds?: number[]; // Array of tag IDs to associate
}

// Updated Zod schema for Note input validation
export const noteInputSchema = z.object({
    title: z.string().min(1, "Title cannot be empty"),
    content: z.string().nullable().optional(), // Allow null or undefined content
    shared: z.boolean().optional().default(false),
    tagIds: z.array(z.number().int().positive()).optional(),
});