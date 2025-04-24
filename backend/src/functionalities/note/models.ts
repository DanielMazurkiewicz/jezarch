import { Tag } from '../tag/models'; // Import Tag model
import { z } from 'zod'; // Import Zod

export interface Note {
  noteId?: number;
  title: string;
  content: string; // Can be empty string
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


// Input for creating/updating a note - Now allows nullable content
export interface NoteInput extends Omit<Note, 'noteId' | 'ownerUserId' | 'createdOn' | 'modifiedOn'> {
    content?: string | null; // Allow null content from input
    tagIds?: number[]; // Array of tag IDs to associate
}

// Updated Zod schema for Note input validation
export const noteInputSchema = z.object({
    title: z.string().min(1, "Title cannot be empty"),
    content: z.string().nullable().optional(), // Allow null or undefined content
    shared: z.boolean().optional().default(false),
    tagIds: z.array(z.number().int().positive()).optional(),
});