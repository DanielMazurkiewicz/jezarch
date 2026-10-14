import { db } from '../../../initialization/db';
import { buildUpdateFields } from '../../../utils/sql';
import type { SignatureComponent, SignatureComponentIndexType } from './models'; // Import type
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';

// One-time migration: add columns added after the table first shipped.
// CREATE TABLE IF NOT EXISTS leaves pre-existing databases without them, so the
// schema is topped up with ALTER TABLE ADD COLUMN when a column is missing.
const ADDITIONAL_COLUMNS: [string, string][] = [
    ['is_main', 'BOOLEAN NOT NULL DEFAULT 0'],
    ['type', "TEXT NOT NULL DEFAULT 'FLAT' CHECK(type IN ('FLAT','TREE','ELEMENT'))"],
    ['element_id', 'INTEGER'],
];

async function ensureSignatureComponentColumns() {
    const columns: { name: string }[] = db.query<{ name: string }, any[]>('PRAGMA table_info(signature_components)').all();
    const existing = new Set(columns.map(col => col.name));
    for (const [name, type] of ADDITIONAL_COLUMNS) {
        if (existing.has(name)) continue;
        await db.exec(`ALTER TABLE signature_components ADD COLUMN ${name} ${type}`);
        await Log.info(`Added missing column ${name} to signature_components.`, 'system', 'migrate');
    }
}

// DDL for the signature components table. The tableName parameter allows creating
// a temporary copy under a different name during migrations.
const signatureComponentsTableDDL = (tableName: string) => `
    CREATE TABLE IF NOT EXISTS ${tableName} (
        signatureComponentId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        index_count INTEGER NOT NULL DEFAULT 0, -- Added field
        index_type TEXT NOT NULL DEFAULT 'dec' CHECK(index_type IN ('dec', 'roman', 'small_char', 'capital_char')), -- Added field with constraint
        is_main BOOLEAN NOT NULL DEFAULT 0, -- Marks a component as part of the main signature system
        type TEXT NOT NULL DEFAULT 'FLAT' CHECK(type IN ('FLAT','TREE','ELEMENT')), -- Component kind
        element_id INTEGER, -- For type ELEMENT: id of the mirrored element
        createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        -- isDeleted BOOLEAN NOT NULL DEFAULT FALSE -- For soft deletes
    )
`;

// One-time migration: the table originally shipped with an inline
// `name TEXT NOT NULL UNIQUE` constraint. Uniqueness is now enforced only for
// non-ELEMENT components through a partial index (ELEMENT mirrors may share
// names). SQLite refuses to DROP the autoindex backing a UNIQUE constraint
// ("index associated with UNIQUE or PRIMARY KEY constraint cannot be dropped"),
// so the only way to get rid of it is the full table-rebuild procedure:
// copy the rows into a new table, drop the old one, rename.
async function migrateComponentNameUniqueness() {
    // origin: 'c' = CREATE INDEX (droppable), 'u' = UNIQUE constraint, 'pk' = PRIMARY KEY
    const indexes = db.query<{ name: string; origin: string }, any[]>('PRAGMA index_list(signature_components)').all();
    if (!indexes.some(index => index.origin === 'u')) return;

    await Log.info(`Migrating signature_components: removing the global UNIQUE constraint on name.`, 'system', 'migrate');
    const migratedTable = 'signature_components_migrated';

    // signature_elements references signature_components with ON DELETE CASCADE.
    // Dropping the parent table while PRAGMA foreign_keys = ON makes SQLite run an
    // implicit "DELETE FROM" first, which would cascade-delete every element.
    // FK enforcement must therefore be disabled for the rebuild — and the PRAGMA
    // only takes effect OUTSIDE a transaction.
    db.exec('PRAGMA foreign_keys = OFF;');
    try {
        if ((db.query('PRAGMA foreign_keys;').get() as any)?.foreign_keys === 1) {
            throw new Error('Cannot rebuild signature_components: PRAGMA foreign_keys could not be disabled (are we inside a transaction?).');
        }
        const migration = db.transaction(() => {
            db.exec(signatureComponentsTableDDL(migratedTable));
            db.exec(`
                INSERT INTO ${migratedTable} (
                    signatureComponentId, name, description, index_count, index_type,
                    is_main, type, element_id, createdOn, modifiedOn
                )
                SELECT signatureComponentId, name, description, index_count, index_type,
                    is_main, type, element_id, createdOn, modifiedOn
                FROM signature_components
            `);
            db.exec(`DROP TABLE signature_components;`);
            db.exec(`ALTER TABLE ${migratedTable} RENAME TO signature_components;`);
        });
        migration();

        const violations = db.query('PRAGMA foreign_key_check;').all();
        if (violations.length > 0) {
            throw new Error(`Foreign key violations detected after signature_components migration: ${JSON.stringify(violations)}`);
        }
    } finally {
        db.exec('PRAGMA foreign_keys = ON;');
    }
    await Log.info(`Migration of signature_components to a partial name uniqueness completed.`, 'system', 'migrate');
}

// Initialization function (called in initializeDatabase)
export async function initializeSignatureComponentTable() {
    // Name uniqueness is enforced only for non-ELEMENT components (see the partial
    // index below): ELEMENT components are internal mirrors of elements and may
    // share names with each other or with regular components.
    await db.exec(signatureComponentsTableDDL('signature_components'));
    // Top up the schema first: the rebuild in migrateComponentNameUniqueness copies
    // every column by name and would fail on legacy databases still missing some.
    await ensureSignatureComponentColumns();
    // Replace the legacy global unique index on name (a standalone index, droppable)
    // or the autoindex of the original inline UNIQUE constraint (table rebuild).
    await db.exec(`DROP INDEX IF EXISTS idx_signature_component_name;`);
    await migrateComponentNameUniqueness();
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_signature_component_name_non_element ON signature_components (name) WHERE type != 'ELEMENT';`);
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
        is_main: Boolean(data.is_main), // Map main component flag
        type: (data.type ?? 'FLAT') as SignatureComponent['type'], // Missing values are treated as FLAT
        element_id: data.element_id ?? null,
        createdOn: new Date(data.createdOn),
        modifiedOn: new Date(data.modifiedOn),
        // isDeleted: Boolean(data.isDeleted), // If soft delete added
    } as SignatureComponent;
};

// --- Operations ---

// Updated createComponent to handle index_type, is_main and the component kind.
// `type`/`element_id` are mostly used internally (ELEMENT mirrors created by the
// element endpoints); public callers pass FLAT or TREE with element_id null.
export async function createComponent(
    name: string,
    description?: string,
    index_type: SignatureComponentIndexType = 'dec',
    is_main: boolean = false,
    type: SignatureComponent['type'] = 'FLAT',
    element_id: number | null = null
): Promise<SignatureComponent> {
    try {
        const now = sqliteNow();
        const statement = db.prepare(
            `INSERT INTO signature_components (name, description, index_type, is_main, type, element_id, createdOn, modifiedOn) -- index_count uses DEFAULT 0
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *`
        );
        // Use null for undefined description to store SQL NULL
        const newComponent = statement.get(name, description ?? null, index_type, is_main, type ?? 'FLAT', element_id, now ?? null, now ?? null);
        return dbToComponent(newComponent) as SignatureComponent; // Known to exist
    } catch (error: any) {
        await Log.error('Failed to create signature component', 'system', 'database', { name, error });
        if (error.message?.includes('UNIQUE constraint failed')) {
             throw new Error(`Component name '${name}' already exists.`);
        }
        throw error; // Re-throw for controller
    }
}

export async function getComponentById(id: number): Promise<SignatureComponent | undefined> {
    // Add "WHERE isDeleted = FALSE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_components WHERE signatureComponentId = ?`);
    return dbToComponent(statement.get(id));
}

export async function getComponentByName(name: string): Promise<SignatureComponent | undefined> {
     // Add "WHERE isDeleted = FALSE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_components WHERE name = ?`);
    return dbToComponent(statement.get(name));
}

export async function getAllComponents(): Promise<SignatureComponent[]> {
     // Add "WHERE isDeleted = FALSE" if using soft deletes
    // Internal ELEMENT mirrors must never appear in component lists.
    const statement = db.prepare(`SELECT * FROM signature_components WHERE type != 'ELEMENT' ORDER BY name`);
    const results = statement.all();
    return results.map(dbToComponent).filter(c => c !== undefined) as SignatureComponent[];
}

// Gets the internal ELEMENT component that mirrors the given element, if any.
export async function getComponentByElementId(elementId: number): Promise<SignatureComponent | undefined> {
    const statement = db.prepare(`SELECT * FROM signature_components WHERE element_id = ?`);
    return dbToComponent(statement.get(elementId));
}

// Creates or updates the internal ELEMENT component mirroring an element.
// The mirror always keeps the same name as the element and stores its id;
// `index_type` is only applied when provided (on update it may be kept).
export async function upsertElementComponent(
    elementId: number,
    name: string,
    index_type?: SignatureComponentIndexType
): Promise<SignatureComponent> {
    const existing = await getComponentByElementId(elementId);
    if (existing) {
        const now = sqliteNow();
        const statement = db.prepare(
            `UPDATE signature_components
             SET name = ?, index_type = ?, modifiedOn = ?
             WHERE element_id = ?
             RETURNING *`
        );
        const updated = statement.get(name, index_type ?? existing.index_type, now ?? null, elementId);
        if (!updated) throw new Error(`Element component for element ${elementId} could not be updated.`);
        return dbToComponent(updated) as SignatureComponent;
    }
    return createComponent(name, undefined, index_type ?? 'dec', false, 'ELEMENT', elementId);
}

// Deletes the internal ELEMENT component mirroring the given element (if any).
export async function deleteComponentByElementId(elementId: number): Promise<boolean> {
    const existing = await getComponentByElementId(elementId);
    if (!existing?.signatureComponentId) return false;
    return deleteComponent(existing.signatureComponentId);
}

export async function updateComponent(
    id: number,
    data: Partial<{ name: string; description: string | null; index_type: SignatureComponentIndexType; is_main: boolean }>
): Promise<SignatureComponent | undefined> {
    const { sets, params } = buildUpdateFields({
        name: data.name,
        description: data.description,
        index_type: data.index_type,
        is_main: data.is_main,
    });

    if (sets.length === 0) return getComponentById(id);

    sets.push('modifiedOn = ?');
    params.push(sqliteNow());
    params.push(id);

    const query = `UPDATE signature_components SET ${sets.join(', ')} WHERE signatureComponentId = ? RETURNING *`;

    try {
        const statement = db.prepare(query);
        const updatedComponent = statement.get(...params);
        return dbToComponent(updatedComponent);
    } catch (error: any) {
        await Log.error('Failed to update signature component', 'system', 'database', { id, data, error });
         if (error.message?.includes('UNIQUE constraint failed: signature_components.name')) {
             throw new Error(`Component name '${data.name}' already exists.`);
        }
         if (error.message?.includes('CHECK constraint failed')) {
             throw new Error(`Invalid index_type provided: ${data.index_type}`);
         }
        throw error;
    }
}

export async function deleteComponent(id: number): Promise<boolean> {
     // If using soft delete:
     // return !!(await updateComponent(id, { isDeleted: true }));

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