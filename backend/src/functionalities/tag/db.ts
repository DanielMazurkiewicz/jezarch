
import { db } from '../../initialization/db';
import type { Tag } from './models';
import { Log } from '../log/db';

// initialization function
export async function initializeTagTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
            tagId INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT
        )
    `);

    await dedupeTagNames();

    // Enforce unique tag names; the controllers' 409 "already exists" paths
    // rely on this constraint being present.
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_name ON tags (name);`);
}

/**
 * Merges duplicate tag names (possible before the unique index existed):
 * the lowest tagId wins, all junction references are remapped to it and
 * redundant rows are removed.
 */
async function dedupeTagNames() {
    const duplicates = db.prepare(`
        SELECT name, COUNT(*) as count FROM tags GROUP BY name HAVING COUNT(*) > 1
    `).all() as { name: string }[];
    if (duplicates.length === 0) return;

    await Log.warn(`Found ${duplicates.length} duplicate tag name(s); merging before enabling unique index.`, 'system', 'database');
    const tx = db.transaction(() => {
        for (const { name } of duplicates) {
            const rows = db.prepare('SELECT tagId FROM tags WHERE name = ? ORDER BY tagId ASC').all(name) as { tagId: number }[];
            if (rows.length < 2) continue;
            const keepId = rows[0]!.tagId;
            const removeIds = rows.slice(1).map(r => r.tagId);
            for (const table of ['note_tags', 'archive_document_tags', 'user_allowed_tags']) {
                for (const removeId of removeIds) {
                    db.prepare(`UPDATE OR IGNORE ${table} SET tagId = ? WHERE tagId = ?`).run(keepId, removeId);
                    db.prepare(`DELETE FROM ${table} WHERE tagId = ?`).run(removeId);
                }
            }
            const placeholders = removeIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM tags WHERE tagId IN (${placeholders})`).run(...removeIds);
        }
    });
    tx();
}

// operation functions
export async function createTag(name: string, description: string = ""): Promise<Tag | undefined> {
    try {
        const statement = db.prepare(
            `INSERT INTO tags (name, description) VALUES (?, ?) RETURNING *`
        );
        const newTag = statement.get(name, description) as Tag;
        return newTag;
    } catch (error: any) {
        await Log.error('Failed to create tag', 'system', 'database', error);
        throw error; // Re-throw for controller to handle
    }
}

// Helper to find or create a tag (useful for associating with notes)
export async function findOrCreateTag(name: string): Promise<Tag> {
    let tag = await getTagByName(name);
    if (!tag) {
        tag = await createTag(name);
        if (!tag) {
            throw new Error(`Failed to find or create tag: ${name}`);
        }
    }
    return tag;
}


export async function getTagById(tagId: number): Promise<Tag | undefined> {
    const statement = db.prepare(`SELECT * FROM tags WHERE tagId = ?`);
    const row = statement.get(tagId);
    return row as Tag | undefined;
}

export async function getTagByName(name: string): Promise<Tag | undefined> {
    const statement = db.prepare(`SELECT * FROM tags WHERE name = ?`);
    const row = statement.get(name);
    return row as Tag | undefined;
}

export async function getAllTags(): Promise<Tag[]> {
    const statement = db.prepare(`SELECT * FROM tags ORDER BY name`);
    return statement.all() as Tag[];
}

export async function updateTag(tagId: number, name?: string, description?: string): Promise<void> {
    if (name === undefined && description === undefined) {
        return; // Nothing to update
    }

    let query = `UPDATE tags SET `;
    const params: any[] = [];

    if (name !== undefined) {
        query += `name = ?, `;
        params.push(name);
    }
    if (description !== undefined) {
        query += `description = ?, `;
        params.push(description);
    }

    query = query.slice(0, -2) + ` WHERE tagId = ?`; // Remove trailing comma and space
    params.push(tagId);

    try {
        const statement = db.prepare(query);
        await statement.run(...params);
    } catch (error: any) {
         // Handle unique constraint violation specifically if needed
        if (error.message?.includes('UNIQUE constraint failed: tags.name')) {
             await Log.error(`Failed to update tag ${tagId}: name '${name}' already exists`, 'system', 'database', error);
             throw new Error(`Tag name '${name}' already exists.`); // Re-throw specific error
        }
        await Log.error(`Failed to update tag ${tagId}`, 'system', 'database', error);
        throw error; // Re-throw for controller
    }
}

export async function deleteTag(tagId: number): Promise<void> {
    // Note: Associations in note_tags will be handled by ON DELETE CASCADE
    const statement = db.prepare(`DELETE FROM tags WHERE tagId = ?`);
    const result = statement.run(tagId);
     if (result.changes === 0) {
        await Log.info(`Attempted to delete non-existent tag: ${tagId}`, 'system', 'database');
        // Consider throwing an error if the tag must exist
    }
}
