import { db } from '../../../initialization/db';
import type { SignatureComponent } from './models';
import { Log } from '../../log/db';
import { sqliteDate, sqliteNow } from '../../../utils/sqlite';

// Initialization function (called in initializeDatabase)
export async function initializeSignatureComponentTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS signature_components (
            signatureComponentId INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            -- active BOOLEAN NOT NULL DEFAULT TRUE -- For soft deletes
        )
    `);
    // Optional: Index on name if lookups are frequent
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_component_name ON signature_components (name);`);
}

// --- Helper ---
const dbToComponent = (data: any): SignatureComponent | undefined => {
    if (!data) return undefined;
    return {
        ...data,
        createdOn: new Date(data.createdOn),
        modifiedOn: new Date(data.modifiedOn),
        // active: Boolean(data.active), // If soft delete added
    } as SignatureComponent;
};

// --- Operations ---

export async function createComponent(name: string, description: string = ""): Promise<SignatureComponent> {
    try {
        const now = sqliteNow();
        const statement = db.prepare(
            `INSERT INTO signature_components (name, description, createdOn, modifiedOn)
             VALUES (?, ?, ?, ?)
             RETURNING *`
        );
        // Use null for undefined description to store SQL NULL
        const newComponent = statement.get(name, description ?? null, now ?? null, now ?? null);
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

export async function updateComponent(id: number, data: Partial<{ name: string; description: string | null /*; active: boolean*/ }>): Promise<SignatureComponent | undefined> {
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