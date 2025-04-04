import { db } from '../../../initialization/db';
import type { SignatureElement, SignatureElementSearchResult } from './models';
import type { SignatureComponent } from '../component/models';
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchOnCustomFieldHandlerResult, SearchQueryElement } from '../../../utils/search';

// Initialization function (called in initializeDatabase)
export async function initializeSignatureElementTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS signature_elements (
            signatureElementId INTEGER PRIMARY KEY AUTOINCREMENT,
            signatureComponentId INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            index TEXT, -- Added index field
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            -- active BOOLEAN NOT NULL DEFAULT TRUE, -- For soft deletes
            FOREIGN KEY (signatureComponentId) REFERENCES signature_components(signatureComponentId) ON DELETE CASCADE -- Delete elements if component is deleted
        )
    `);
     // Optional: Index for faster lookup by component or name
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_component ON signature_elements (signatureComponentId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_name ON signature_elements (name);`);
    // Optional: Index on index field if searched frequently
    // await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_index ON signature_elements (index);`);
}

// Initialization function for the M:N relationship (called in initializeDatabase)
export async function initializeSignatureElementParentTable() {
     await db.exec(`
        CREATE TABLE IF NOT EXISTS signature_element_parents (
            childElementId INTEGER NOT NULL,
            parentElementId INTEGER NOT NULL,
            PRIMARY KEY (childElementId, parentElementId),
            FOREIGN KEY (childElementId) REFERENCES signature_elements(signatureElementId) ON DELETE CASCADE,
            FOREIGN KEY (parentElementId) REFERENCES signature_elements(signatureElementId) ON DELETE CASCADE
        )
    `);
     // Index for faster lookup of parents for a given child
     await db.exec(`CREATE INDEX IF NOT EXISTS idx_sep_child ON signature_element_parents (childElementId);`);
     // Index for faster lookup of children for a given parent (useful for search by parent)
     await db.exec(`CREATE INDEX IF NOT EXISTS idx_sep_parent ON signature_element_parents (parentElementId);`);
}

// --- Helper ---
const dbToElement = (data: any): SignatureElement | undefined => {
    if (!data) return undefined;
    return {
        signatureElementId: data.signatureElementId,
        signatureComponentId: data.signatureComponentId,
        name: data.name,
        description: data.description,
        index: data.index, // Map the index field
        createdOn: new Date(data.createdOn),
        modifiedOn: new Date(data.modifiedOn),
        // active: Boolean(data.active), // If soft delete added
    } as SignatureElement;
};

// --- Operations ---

export async function createElement(
    componentId: number,
    name: string,
    description?: string,
    index?: string 
): Promise<SignatureElement> {
    try {
        const now = sqliteNow();
        const statement = db.prepare(
            `INSERT INTO signature_elements (signatureComponentId, name, description, index, createdOn, modifiedOn)
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING *`
        );
        const newElement = statement.get(componentId, name, description ?? null, index ?? null, now ?? null, now ?? null);
        return dbToElement(newElement) as SignatureElement; // Known to exist
    } catch (error: any) {
         // Catch foreign key violation if componentId doesn't exist? Or let controller handle 404 on component check.
        await Log.error('Failed to create signature element', 'system', 'database', { componentId, name, error });
        throw error;
    }
}

export async function getElementById(id: number, populate: ('component' | 'parents')[] = []): Promise<SignatureElement | undefined> {
     // Add "WHERE active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_elements WHERE signatureElementId = ?`);
    const elementData = statement.get(id);
    const element = dbToElement(elementData);

    if (element && populate.length > 0) {
        if (populate.includes('component')) {
            element.component = await getComponentForElement(element.signatureComponentId);
        }
        if (populate.includes('parents')) {
            element.parentElements = await getParentElements(id);
        }
    }
    return element;
}

export async function getElementsByComponentId(componentId: number): Promise<SignatureElement[]> {
     // Add "AND active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_elements WHERE signatureComponentId = ? ORDER BY name`);
    const results = statement.all(componentId);
    return results.map(dbToElement).filter(e => e !== undefined) as SignatureElement[];
}

// Helper to get component details efficiently if needed often
async function getComponentForElement(componentId: number): Promise<SignatureComponent | undefined> {
    // This could be optimized with caching if called very frequently
    const statement = db.prepare(`SELECT * FROM signature_components WHERE signatureComponentId = ?`);
    // Re-use component's dbToModel logic if possible, or define locally
    const compData = statement.get(componentId) as SignatureComponent;
     if (!compData) return undefined;
     return {
        signatureComponentId: compData.signatureComponentId,
        name: compData.name,
        description: compData.description,
        createdOn: new Date(compData.createdOn),
        modifiedOn: new Date(compData.modifiedOn),
        // active: Boolean(compData.active),
    } as SignatureComponent;
}

export async function updateElement(
    id: number,
    data: Partial<{ name: string; description: string | null; index: string | null /*; active: boolean*/ }>
): Promise<SignatureElement | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
        fieldsToUpdate.push('name = ?');
        params.push(data.name);
    }
     if (data.description !== undefined) { // Check explicitly to allow null
        fieldsToUpdate.push('description = ?');
        params.push(data.description);
    }
    if (data.index !== undefined) { // Check explicitly to allow null for index
        fieldsToUpdate.push('index = ?');
        params.push(data.index);
    }
    // if (data.active !== undefined) {
    //     fieldsToUpdate.push('active = ?');
    //     params.push(data.active ? 1 : 0);
    // }

    if (fieldsToUpdate.length === 0) {
        return getElementById(id); // No changes
    }

    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());

    const query = `UPDATE signature_elements SET ${fieldsToUpdate.join(', ')} WHERE signatureElementId = ? RETURNING *`;
    params.push(id);

    try {
        const statement = db.prepare(query);
        const updatedElement = statement.get(...params);
        return dbToElement(updatedElement);
    } catch (error: any) {
        await Log.error('Failed to update signature element', 'system', 'database', { id, data, error });
        throw error;
    }
}

export async function deleteElement(id: number): Promise<boolean> {
    // If using soft delete:
    // return !!(await updateElement(id, { active: false }));

    // Hard delete - Cascade handles parent/child relationships in signature_element_parents
    const statement = db.prepare(`DELETE FROM signature_elements WHERE signatureElementId = ?`);
    try {
        const result = statement.run(id);
        const deleted = result.changes > 0;
         if (!deleted) {
             await Log.info(`Attempted to delete non-existent element: ${id}`, 'system', 'database');
        }
        return deleted;
    } catch (error) {
         await Log.error('Failed to delete signature element', 'system', 'database', { id, error });
         throw error;
    }
}

// --- Parent Relationship Management ---

export async function setParentElementIds(childElementId: number, parentElementIds: number[]): Promise<void> {
    const transaction = db.transaction((ids: number[]) => {
        // 1. Delete existing parent associations for this child
        const deleteStmt = db.prepare(`DELETE FROM signature_element_parents WHERE childElementId = ?`);
        deleteStmt.run(childElementId);

        if (!ids || ids.length === 0) {
            return; // No new parents to add
        }

        // 2. Insert new associations (ignore duplicates or invalid IDs gracefully)
        // Ensure parent IDs actually exist in signature_elements? Optional, adds overhead.
        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO signature_element_parents (childElementId, parentElementId)
            SELECT ?, ?
            WHERE EXISTS (SELECT 1 FROM signature_elements WHERE signatureElementId = ?) -- Ensure parent exists
              AND ? != ? -- Prevent self-parenting
        `);
        for (const parentId of ids) {
             // Added checks within the SQL itself
             insertStmt.run(childElementId, parentId, parentId, childElementId, parentId);
        }
    });

    try {
        await transaction(parentElementIds);
    } catch (error) {
         await Log.error('Failed to set parent elements', 'system', 'database', { childElementId, parentElementIds, error });
         throw error;
    }
}

export async function getParentElements(childElementId: number): Promise<SignatureElement[]> {
    // Add "AND se.active = TRUE" if using soft deletes
    const statement = db.prepare(`
        SELECT se.* FROM signature_elements se
        JOIN signature_element_parents sep ON se.signatureElementId = sep.parentElementId
        WHERE sep.childElementId = ?
        ORDER BY se.name
    `);
    const results = statement.all(childElementId);
    return results.map(dbToElement).filter(e => e !== undefined) as SignatureElement[];
}

export async function getChildElements(parentElementId: number): Promise<SignatureElement[]> {
    // Add "AND se.active = TRUE" if using soft deletes
     const statement = db.prepare(`
        SELECT se.* FROM signature_elements se
        JOIN signature_element_parents sep ON se.signatureElementId = sep.childElementId
        WHERE sep.parentElementId = ?
        ORDER BY se.name
    `);
    const results = statement.all(parentElementId);
    return results.map(dbToElement).filter(e => e !== undefined) as SignatureElement[];
}


// --- Search ---

// Custom field handler for searching by parent elements
export const elementParentSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element: SearchQueryElement,
    tableAlias: string
): SearchOnCustomFieldHandlerResult => {

    // Handle 'parentIds' field with 'ANY_OF' condition
    if (element.field === 'parentIds' && element.condition === 'ANY_OF' && Array.isArray(element.value)) {
        const parentIds = element.value.filter(id => typeof id === 'number' && Number.isInteger(id) && id > 0);

        if (parentIds.length === 0) {
            // Match nothing if specific parent IDs are required but none are valid/provided
            return { whereCondition: element.not ? '1=1' : '1=0', params: [] };
        }

        const placeholders = parentIds.map(() => '?').join(', ');

        // Use EXISTS subquery for efficiency, checking if the element (aliased)
        // exists as a child for *any* of the specified parent IDs.
        const subQuery = `
            EXISTS (
                SELECT 1 FROM signature_element_parents sep
                WHERE sep.childElementId = ${tableAlias}.signatureElementId
                  AND sep.parentElementId IN (${placeholders})
            )
        `;

        return {
            // No JOIN needed at the top level, handled by EXISTS
            joinClause: undefined, // No top-level JOIN needed specifically for this condition
            whereCondition: element.not ? `NOT (${subQuery})` : subQuery,
            params: parentIds
        };
    }

    // Handle 'hasParents' boolean field (example)
     if (element.field === 'hasParents' && element.condition === 'EQ' && typeof element.value === 'boolean') {
         const expectedValue = element.value; // true or false
         const subQuery = `
            EXISTS (
                SELECT 1 FROM signature_element_parents sep
                WHERE sep.childElementId = ${tableAlias}.signatureElementId
            )
         `;
         // If NOT requested (element.not is true), invert the logic
         const condition = (expectedValue !== element.not) ? subQuery : `NOT (${subQuery})`;

         return { whereCondition: condition, params: [] };
     }


    // This handler doesn't handle other fields or conditions for 'parentIds' / 'hasParents'
    return null;
};

// Type definition for search results including parent IDs
export type ElementSearchResult = SignatureElement & { parentIds?: number[] };

// Potentially a dedicated search function if complex population is needed
// or reuse the generic executeSearch if results are simple enough.
// For now, let's assume the generic search utility is sufficient and
// parent IDs can be fetched separately if needed after the search.