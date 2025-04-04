import { db } from '../../../initialization/db';
import type { SignatureComponent, SignatureComponentIndexType } from './models'; // Import type
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';

// Initialization function (called in initializeDatabase)
export async function initializeSignatureComponentTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS signature_components (
            signatureComponentId INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            index_count INTEGER NOT NULL DEFAULT 0, -- Added field
            index_type TEXT NOT NULL DEFAULT 'dec' CHECK(index_type IN ('dec', 'roman', 'small_char', 'capital_char')), -- Added field with constraint
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            -- active BOOLEAN NOT NULL DEFAULT TRUE -- For soft deletes
        )
    `);
    // Optional: Index on name if lookups are frequent
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_component_name ON signature_components (name);`);
}

// --- Helper ---
export const dbToComponent = (data: any): SignatureComponent | undefined => {
    if (!data) return undefined;
    return {
        signatureComponentId: data.signatureComponentId,
        name: data.name,
        description: data.description,
        index_count: data.index_count, // Map new field
        index_type: data.index_type as SignatureComponentIndexType, // Map new field with type assertion
        createdOn: new Date(data.createdOn),
        modifiedOn: new Date(data.modifiedOn),
        // active: Boolean(data.active), // If soft delete added
    } as SignatureComponent;
};

// --- Operations ---

// Updated createComponent to handle index_type
export async function createComponent(name: string, description?: string, index_type: SignatureComponentIndexType = 'dec'): Promise<SignatureComponent> {
    try {
        const now = sqliteNow();
        const statement = db.prepare(
            `INSERT INTO signature_components (name, description, index_type, createdOn, modifiedOn) -- index_count uses DEFAULT 0
             VALUES (?, ?, ?, ?, ?)
             RETURNING *`
        );
        // Use null for undefined description to store SQL NULL
        const newComponent = statement.get(name, description ?? null, index_type, now ?? null, now ?? null);
        return dbToComponent(newComponent) as SignatureComponent; // Known to exist
    } catch (error: any) {
        await Log.error('Failed to create signature component', 'system', 'database', { name, error });
        if (error.message?.includes('UNIQUE constraint failed: signature_components.name')) {
             throw new Error(`Component name '${name}' already exists.`);
        }
        throw error; // Re-throw for controller
    }
}

export async function getComponentById(id: number): Promise<SignatureComponent | undefined> {
    // Add "WHERE active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_components WHERE signatureComponentId = ?`);
    return dbToComponent(statement.get(id));
}

export async function getComponentByName(name: string): Promise<SignatureComponent | undefined> {
     // Add "WHERE active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_components WHERE name = ?`);
    return dbToComponent(statement.get(name));
}

export async function getAllComponents(): Promise<SignatureComponent[]> {
     // Add "WHERE active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_components ORDER BY name`);
    const results = statement.all();
    return results.map(dbToComponent).filter(c => c !== undefined) as SignatureComponent[];
}

// Updated updateComponent to handle index_type
export async function updateComponent(
    id: number,
    data: Partial<{ name: string; description: string | null; index_type: SignatureComponentIndexType /*; active: boolean*/ }>
): Promise<SignatureComponent | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
        fieldsToUpdate.push('name = ?');
        params.push(data.name);
    }
    if (data.description !== undefined) { // Check explicitly for undefined to allow setting to null
        fieldsToUpdate.push('description = ?');
        params.push(data.description); // Pass null directly if intended
    }
    if (data.index_type !== undefined) { // Allow updating index_type
        fieldsToUpdate.push('index_type = ?');
        params.push(data.index_type);
    }
    // NOTE: index_count is NOT updated here, it's managed internally

    // if (data.active !== undefined) {
    //     fieldsToUpdate.push('active = ?');
    //     params.push(data.active ? 1 : 0);
    // }

    if (fieldsToUpdate.length === 0) {
        return getComponentById(id); // No changes, return current state
    }

    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());

    const query = `UPDATE signature_components SET ${fieldsToUpdate.join(', ')} WHERE signatureComponentId = ? RETURNING *`;
    params.push(id);

    try {
        const statement = db.prepare(query);
        const updatedComponent = statement.get(...params);
        return dbToComponent(updatedComponent);
    } catch (error: any) {
        await Log.error('Failed to update signature component', 'system', 'database', { id, data, error });
         if (error.message?.includes('UNIQUE constraint failed: signature_components.name')) {
             throw new Error(`Component name '${data.name}' already exists.`);
        }
         if (error.message?.includes('CHECK constraint failed')) { // Catch index_type constraint violation
             throw new Error(`Invalid index_type provided: ${data.index_type}`);
         }
        throw error; // Re-throw
    }
}

export async function deleteComponent(id: number): Promise<boolean> {
     // If using soft delete:
     // return !!(await updateComponent(id, { active: false }));

    // Hard delete - Elements associated via Foreign Key ON DELETE CASCADE will also be deleted
    const statement = db.prepare(`DELETE FROM signature_components WHERE signatureComponentId = ?`);
    try {
        const result = statement.run(id);
        const deleted = result.changes > 0;
        if (!deleted) {
             await Log.info(`Attempted to delete non-existent component: ${id}`, 'system', 'database');
        }
        return deleted;
    } catch (error) {
         await Log.error('Failed to delete signature component', 'system', 'database', { id, error });
         throw error;
    }
}


// --- Counter Management ---

/**
 * Increments the index_count for a component and returns the NEW count.
 * This should be called within a transaction with element creation.
 */
export async function incrementComponentIndexCount(componentId: number): Promise<number> {
    try {
        const statement = db.prepare(
            `UPDATE signature_components
             SET index_count = index_count + 1, modifiedOn = ?
             WHERE signatureComponentId = ?
             RETURNING index_count`
        );
        const result = statement.get(sqliteNow() ?? null, componentId) as { index_count: number };
        if (!result) {
            throw new Error(`Component with ID ${componentId} not found during count increment.`);
        }
        return result.index_count;
    } catch (error) {
        await Log.error('Failed to increment component index count', 'system', 'database', { componentId, error });
        throw error;
    }
}

/**
 * Resets the index_count for a component to zero.
 * Used during re-indexing.
 */
export async function resetComponentIndexCount(componentId: number): Promise<void> {
    try {
        const statement = db.prepare(
            `UPDATE signature_components
             SET index_count = 0, modifiedOn = ?
             WHERE signatureComponentId = ?`
        );
        const result = statement.run(sqliteNow()?? null, componentId);
        if (result.changes === 0) {
             // Log or throw if component not found? Depends on context (re-index checks first)
             await Log.error(`Attempted to reset index count for non-existent component: ${componentId}`, 'system', 'database');
        }
    } catch (error) {
        await Log.error('Failed to reset component index count', 'system', 'database', { componentId, error });
        throw error;
    }
}

/**
 * Sets the index_count for a component to a specific value.
 * Used at the end of re-indexing.
 */
export async function setComponentIndexCount(componentId: number, count: number): Promise<void> {
     try {
        const statement = db.prepare(
            `UPDATE signature_components
             SET index_count = ?, modifiedOn = ?
             WHERE signatureComponentId = ?`
        );
        const result = statement.run(count, sqliteNow() ?? null, componentId);
         if (result.changes === 0) {
             await Log.error(`Attempted to set index count for non-existent component: ${componentId}`, 'system', 'database');
             // Or throw error if this indicates a problem in re-indexing logic
         }
    } catch (error) {
        await Log.error('Failed to set component index count', 'system', 'database', { componentId, count, error });
        throw error;
    }
}