import { db } from "../../../initialization/db";
import { Tag } from "../../tag/models";
import { Log } from '../../log/db'; // Import Log for error logging

// Creates the junction table
export async function initializeNoteTagTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS note_tags (
            noteId INTEGER NOT NULL,
            tagId INTEGER NOT NULL,
            PRIMARY KEY (noteId, tagId),
            FOREIGN KEY (noteId) REFERENCES notes(noteId) ON DELETE CASCADE,
            FOREIGN KEY (tagId) REFERENCES tags(tagId) ON DELETE CASCADE
        )
    `);
}

// Gets tags for a specific note
export async function getTagsForNote(noteId: number): Promise<Tag[]> {
    try {
        const statement = db.prepare(`
            SELECT t.* FROM tags t
            JOIN note_tags nt ON t.tagId = nt.tagId
            WHERE nt.noteId = ?
            ORDER BY t.name COLLATE NOCASE -- Ensure case-insensitive sorting
        `);
        // Ensure result is typed correctly
        return statement.all(noteId) as Tag[];
    } catch (error) {
        await Log.error(`Failed to get tags for note ${noteId}`, 'system', 'database', error);
        // Return empty array on error to avoid breaking callers
        return [];
    }
}


// Sets the tags for a note, replacing existing ones
export async function setTagsForNote(noteId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction(() => { // Removed async from transaction function itself
        // 1. Delete existing associations for this note
        try {
            const deleteStmt = db.prepare(`DELETE FROM note_tags WHERE noteId = ?`);
            deleteStmt.run(noteId);
        } catch (error) {
             Log.error(`Failed to delete existing tags for note ${noteId}`, 'system', 'database', error);
             throw error; // Abort transaction
        }

        if (!tagIds || tagIds.length === 0) {
            return; // No new tags to add
        }

        // 2. Insert new associations
        try {
            const insertStmt = db.prepare(`
                INSERT OR IGNORE INTO note_tags (noteId, tagId)
                SELECT ?, ?
                WHERE EXISTS (SELECT 1 FROM tags WHERE tagId = ?) -- Ensure tag exists before linking
            `);
            for (const tagId of tagIds) {
                // Ensure tagId is a positive integer before attempting insert
                if (typeof tagId === 'number' && Number.isInteger(tagId) && tagId > 0) {
                     insertStmt.run(noteId, tagId, tagId); // Pass tagId again for EXISTS check
                } else {
                     Log.warn(`Skipping invalid tagId ${tagId} for note ${noteId}`, 'system', 'database');
                }
            }
        } catch (error) {
             Log.error(`Failed to insert new tags for note ${noteId}`, 'system', 'database', { tagIds, error });
             throw error; // Abort transaction
        }
    });

    try {
         transaction(); // Execute the synchronous transaction
    } catch (error) {
         // Log error if transaction failed (already logged specific step errors inside)
         await Log.error(`Transaction failed for setTagsForNote ${noteId}`, 'system', 'database', { tagIds, error });
         // Re-throw to signal failure to the controller
         throw error;
    }
}