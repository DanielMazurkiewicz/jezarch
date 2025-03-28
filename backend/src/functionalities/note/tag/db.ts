import { db } from "../../../initialization/db";
import { Tag } from "../../tag/models";

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
    const statement = db.prepare(`
        SELECT t.* FROM tags t
        JOIN note_tags nt ON t.tagId = nt.tagId
        WHERE nt.noteId = ?
        ORDER BY t.name
    `);
    return statement.all(noteId) as Tag[];
}


// Sets the tags for a note, replacing existing ones
export async function setTagsForNote(noteId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction(async (tagsToSet) => {
        // 1. Delete existing associations for this note
        const deleteStmt = db.prepare(`DELETE FROM note_tags WHERE noteId = ?`);
        deleteStmt.run(noteId);

        if (!tagsToSet || tagsToSet.length === 0) {
            return; // No new tags to add
        }

        // 2. Insert new associations
        if (tagsToSet.length > 0) {
            const insertStmt = db.prepare(`INSERT OR IGNORE INTO note_tags (noteId, tagId) VALUES (?, ?)`);
            for (const tagId of tagsToSet) {
                insertStmt.run(noteId, tagId);
            }
        }
    });

    await transaction(tagIds);
}