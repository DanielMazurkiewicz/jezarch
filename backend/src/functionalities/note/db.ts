import { db } from '../../initialization/db';
import type { Note, NoteWithDetails } from './models'; // Use NoteWithDetails
import { getTagsForNote } from './tag/db'; // Import getTagsForNote
import { sqliteNow } from '../../utils/sqlite'; // Import sqliteNow
import { Log } from '../log/db'; // Import Log

// initialization function (remains the same)
export async function initializeNoteTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            noteId INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            shared BOOLEAN NOT NULL DEFAULT FALSE,
            ownerUserId INTEGER NOT NULL,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerUserId) REFERENCES users(userId) ON DELETE CASCADE -- Cascade delete notes if user is deleted
        )
    `);
    // Add index for ownerUserId for faster lookups
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_note_owner ON notes (ownerUserId);`);
    // Add index for shared status for faster searching
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_note_shared ON notes (shared);`);
}


// --- Helper ---
// Now accepts an optional row argument
export const dbToNote = async (row?: any): Promise<NoteWithDetails | undefined> => {
    if (!row) return undefined;

    const note: NoteWithDetails = {
        noteId: row.noteId,
        title: row.title,
        content: row.content ?? '', // Ensure content is string
        shared: Boolean(row.shared),
        ownerUserId: row.ownerUserId,
        createdOn: new Date(row.createdOn),
        modifiedOn: new Date(row.modifiedOn),
        // Conditionally add ownerLogin if present in the row (from JOIN)
        ownerLogin: row.ownerLogin ?? undefined,
        tags: [], // Initialize tags array
    };

    // Fetch tags separately if noteId is available
    if (note.noteId) {
        try {
            note.tags = await getTagsForNote(note.noteId);
        } catch (tagError) {
            await Log.error(`Failed to fetch tags for note ${note.noteId}`, 'system', 'database', tagError);
            // Continue without tags if fetching fails
        }
    }

    return note;
}


// --- Operations ---

// Create function remains the same, returning only the ID
export async function createNote(
    title: string,
    content: string,
    ownerUserId: number,
    shared: boolean = false
): Promise<number> {
    const now = sqliteNow();
    try {
        const statement = db.prepare(
          `INSERT INTO notes (title, content, ownerUserId, shared, createdOn, modifiedOn)
           VALUES (?, ?, ?, ?, ?, ?)
           RETURNING noteId`
        );
        // Use null for empty content? For now, store empty string.
        // Explicitly cast timestamps to string | null for compatibility
        const result = statement.get(
            title,
            content,
            ownerUserId,
            shared ? 1 : 0,
            now as string | null,
            now as string | null
        ) as { noteId: number };
        return result.noteId;
    } catch (error) {
         await Log.error('Failed to create note in DB', 'system', 'database', { title, ownerUserId, error });
         throw error; // Re-throw for controller
    }
}

// Get a single note by ID, now joins with users and fetches tags
export async function getNoteById(noteId: number): Promise<NoteWithDetails | undefined> {
    try {
        const statement = db.prepare(`
            SELECT n.*, u.login as ownerLogin
            FROM notes n
            JOIN users u ON n.ownerUserId = u.userId
            WHERE n.noteId = ?
        `);
        const row = statement.get(noteId);
        return await dbToNote(row); // dbToNote now fetches tags
    } catch (error) {
        await Log.error(`Failed to get note by ID ${noteId}`, 'system', 'database', error);
        throw error;
    }
}

// Get all notes ONLY for a specific owner, now joins with users and fetches tags
export async function getAllNotesByOwnerUserId(ownerUserId: number): Promise<NoteWithDetails[]> {
     try {
        const statement = db.prepare(`
            SELECT n.*, u.login as ownerLogin
            FROM notes n
            JOIN users u ON n.ownerUserId = u.userId
            WHERE n.ownerUserId = ?
            ORDER BY n.modifiedOn DESC
        `);
        const rows = statement.all(ownerUserId);
        // Use Promise.all to fetch tags concurrently for all notes
        return await Promise.all(rows.map(row => dbToNote(row) as Promise<NoteWithDetails>));
     } catch (error) {
         await Log.error(`Failed to get notes for owner ${ownerUserId}`, 'system', 'database', error);
         throw error;
     }
}

// Get notes relevant to a user (owned or shared) - Used by search/general listing
// Returns basic note data + ownerLogin, tags need separate population
export async function getNotesForUser(userId: number): Promise<(Note & { ownerLogin: string })[]> {
     try {
        const statement = db.prepare(`
            SELECT n.*, u.login as ownerLogin
            FROM notes n
            JOIN users u ON n.ownerUserId = u.userId
            WHERE n.ownerUserId = ? OR n.shared = TRUE
            ORDER BY n.modifiedOn DESC
        `);
        // This query doesn't fetch tags yet, they are populated in the controller after search usually
        return statement.all(userId) as (Note & { ownerLogin: string })[];
     } catch (error) {
         await Log.error(`Failed to get notes for user ${userId} (own/shared)`, 'system', 'database', error);
         throw error;
     }
}


// Update function - simplified, tags are handled separately
// Adjusted content type to accept string | null | undefined
export async function updateNote(
    noteId: number,
    title?: string,
    content?: string | null | undefined, // Allow null/undefined here
    shared?: boolean
) {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];
    const now = sqliteNow();

    if (title !== undefined) {
        fieldsToUpdate.push('title = ?');
        params.push(title);
    }
    if (content !== undefined) { // Check for undefined only
        fieldsToUpdate.push('content = ?');
        params.push(content); // Pass null or string directly to DB
    }
    if (shared !== undefined) {
        fieldsToUpdate.push('shared = ?');
        params.push(shared ? 1 : 0);
    }

    if (fieldsToUpdate.length === 0) {
        // If only tags were potentially changed, don't update modifiedOn here
        // The controller handles tags separately
        return; // No core fields to update
    }

    fieldsToUpdate.push('modifiedOn = ?');
    params.push(now);

    const query = `UPDATE notes SET ${fieldsToUpdate.join(', ')} WHERE noteId = ?`;
    params.push(noteId);

    try {
        const statement = db.prepare(query);
        statement.run(...params);
    } catch (error) {
        await Log.error(`Failed to update note ${noteId}`, 'system', 'database', { error, fieldsToUpdate });
        throw error;
    }
}

// Delete function remains the same
export async function deleteNote(noteId: number): Promise<void> {
    // Associated tags in note_tags are deleted via CASCADE constraint
    try {
        const statement = db.prepare(`DELETE FROM notes WHERE noteId = ?`);
        const result = statement.run(noteId);
        if (result.changes === 0) {
             await Log.warn(`Attempted to delete non-existent note: ${noteId}`, 'system', 'database');
             // Optionally throw an error if the note must exist
             // throw new Error(`Note with ID ${noteId} not found for deletion.`);
        }
    } catch (error) {
        await Log.error(`Failed to delete note ${noteId}`, 'system', 'database', error);
        throw error;
    }
}