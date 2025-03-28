import { Tag } from '../tag/models'; // Import Tag model
import { z } from 'zod'; // Import Zod

export interface Note {
  noteId?: number;
  title: string;
  content: string;
  shared: boolean;
  ownerUserId: number;
  createdOn: Date;
  modifiedOn: Date;
  tags?: Tag[]; // Add tags array (populated on retrieval)
}

// Input for creating/updating a note
export interface NoteInput extends Omit<Note, 'noteId' | 'ownerUserId' | 'createdOn' | 'modifiedOn' | 'tags'> {
    tagIds?: number[]; // Array of tag IDs to associate
}

// Optional: Zod schema for Note input validation if needed later
export const noteInputSchema = z.object({
    title: z.string().min(1, "Title cannot be empty"),
    content: z.string(),
    shared: z.boolean().optional().default(false),
    tagIds: z.array(z.number().int().positive()).optional(), // Validate tagIds are positive integers
});