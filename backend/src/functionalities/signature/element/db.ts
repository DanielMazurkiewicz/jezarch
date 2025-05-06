import { db } from '../../../initialization/db';
import type { SignatureElement, SignatureElementSearchResult } from './models';
import type { SignatureComponent } from '../component/models';
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchOnCustomFieldHandlerResult, SearchQueryElement } from '../../../utils/search';
import { dbToComponent } from '../component/db';
import type { ArchiveDocumentSearchResult } from '../../archive/document/models'; // IMPORT CORRECT TYPE

// Initialization function (called in initializeDatabase)
export async function initializeSignatureElementTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS signature_elements (
            signatureElementId INTEGER PRIMARY KEY AUTOINCREMENT,
            signatureComponentId INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            "index" TEXT, -- <<< FIXED: Quoted reserved keyword
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            -- active BOOLEAN NOT NULL DEFAULT TRUE, -- For soft deletes
            FOREIGN KEY (signatureComponentId) REFERENCES signature_components(signatureComponentId) ON DELETE CASCADE -- Delete elements if component is deleted
        )
    `);
     // Optional: Index for faster lookup by component or name
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_component ON signature_elements (signatureComponentId);`);
    // Ensure index exists on name for sorting during re-index
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_name ON signature_elements (name);`);
    // Optional: Index on index field if searched frequently
    // await db.exec(`CREATE INDEX IF NOT EXISTS idx_signature_element_index ON signature_elements ("index");`); // <<< FIXED: Also quote here if using
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

// createElement now just takes the index string, generation happens in controller
export async function createElement(
    componentId: number,
    name: string,
    description?: string,
    index?: string | null // Accept index string (can be null if user provided null/empty)
): Promise<SignatureElement> {
    try {
        const now = sqliteNow();
        const statement = db.prepare(
            `INSERT INTO signature_elements (signatureComponentId, name, description, "index", createdOn, modifiedOn) -- <<< FIXED: Quoted column name
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING *`
        );
        // Store provided index (or null)
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
            // Fetch component with new fields
            element.component = await getComponentForElement(element.signatureComponentId);
        }
        if (populate.includes('parents')) {
            element.parentElements = await getParentElements(id);
        }
    }
    return element;
}

// Ensure sorting by name for re-indexing
export async function getElementsByComponentId(componentId: number): Promise<SignatureElement[]> {
     // Add "AND active = TRUE" if using soft deletes
    const statement = db.prepare(`SELECT * FROM signature_elements WHERE signatureComponentId = ? ORDER BY name COLLATE NOCASE`); // Added COLLATE NOCASE for consistent sorting
    const results = statement.all(componentId);
    return results.map(dbToElement).filter(e => e !== undefined) as SignatureElement[];
}

// Helper to get component details efficiently if needed often
async function getComponentForElement(componentId: number): Promise<SignatureComponent | undefined> {
    // This could be optimized with caching if called very frequently
    const statement = db.prepare(`SELECT * FROM signature_components WHERE signatureComponentId = ?`);
    // Re-use component's dbToModel logic if possible
    const compData = statement.get(componentId);
    return dbToComponent(compData); // Use the updated helper
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
    // Allow explicit update of index via PATCH, but counter is not affected here
    if (data.index !== undefined) {
        fieldsToUpdate.push('"index" = ?'); // <<< FIXED: Quoted column name
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


/**
 * Specifically updates only the index and modifiedOn fields for an element.
 * Used during re-indexing.
 */
export async function updateElementIndex(elementId: number, index: string): Promise<void> {
    try {
        const statement = db.prepare(
            `UPDATE signature_elements
             SET "index" = ?, modifiedOn = ? -- <<< FIXED: Quoted column name
             WHERE signatureElementId = ?`
        );
        const result = statement.run(index, sqliteNow() ?? null, elementId);
        if (result.changes === 0) {
            // This would indicate an issue during re-indexing if an element disappears mid-process
            await Log.error(`Attempted to update index for non-existent element: ${elementId}`, 'system', 'database');
            throw new Error(`Element with ID ${elementId} not found during index update.`);
        }
    } catch (error) {
        await Log.error('Failed to update element index', 'system', 'database', { elementId, index, error });
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
        // Run the transaction using the provided parentElementIds
        transaction(parentElementIds); // Removed await, transaction runs synchronously
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


// --- NEW: Helper for resolving signature paths ---
/**
 * Resolves a single path of element IDs to a display string.
 * Example: [1, 5] -> "[CompA-Idx1] ElementName1 / [CompB-Idx2] ElementName2"
 */
export async function resolveSignaturePathToString(idPath: number[]): Promise<string | null> {
    if (!idPath || idPath.length === 0) return null;
    try {
        const elementsInPath: (SignatureElement | undefined)[] = await Promise.all(
            idPath.map(id => getElementById(id, [])) // No need to populate further here
        );

        const displayParts = elementsInPath.map((el, index) => {
            if (el) {
                // Format: [Index] Name or just Name if no index
                return `${el.index ? `[${el.index}] ` : ''}${el.name}`;
            }
            // Fallback if an element ID in the path is not found
            return `[ID:${idPath[index]} not found]`;
        });
        return displayParts.join(' / ');
    } catch (error) {
        await Log.error('Failed to resolve signature path to string', 'system', 'database_signature_helper', { idPath, error });
        // Return a fallback string indicating error for this path
        return `[Error resolving path: ${idPath.join(',')}]`;
    }
}

/**
 * Populates the 'resolvedDescriptiveSignatures' field for an array of ArchiveDocumentSearchResult.
 * Modifies the documents in place.
 */
export async function populateResolvedDescriptiveSignatures(documents: ArchiveDocumentSearchResult[]): Promise<void> {
    for (const doc of documents) {
        let descriptiveIds: number[][] = [];
        // Check if descriptiveSignatureElementIds is a string (from direct search result)
        // or already an array (from dbToArchiveDocument or similar transformation)
        if (typeof (doc as any).descriptiveSignatureElementIds === 'string') {
            try {
                descriptiveIds = JSON.parse((doc as any).descriptiveSignatureElementIds || '[]');
            } catch (e) {
                await Log.warn('Failed to parse descriptiveSignatureElementIds string in populateResolvedDescriptiveSignatures', 'system', 'signature_resolver', { docId: doc.archiveDocumentId, value: (doc as any).descriptiveSignatureElementIds, error: e });
                descriptiveIds = []; // Default to empty array on parse error
            }
        } else if (Array.isArray((doc as any).descriptiveSignatureElementIds)) {
            descriptiveIds = (doc as any).descriptiveSignatureElementIds;
        }


        if (descriptiveIds && Array.isArray(descriptiveIds) && descriptiveIds.length > 0) {
            const resolvedSignatures: (string | null)[] = await Promise.all(
                descriptiveIds.map(idPath => {
                    // Ensure idPath itself is an array before passing to resolveSignaturePathToString
                    if (Array.isArray(idPath)) {
                        return resolveSignaturePathToString(idPath);
                    }
                    Log.warn(`Invalid idPath found in descriptiveSignatureElementIds for doc ${doc.archiveDocumentId}`, 'system', 'signature_resolver', { idPath });
                    return Promise.resolve(null); // Return null for invalid paths
                })
            );
            // Filter out nulls and assign
            doc.resolvedDescriptiveSignatures = resolvedSignatures.filter((s): s is string => s !== null);
        } else {
            doc.resolvedDescriptiveSignatures = [];
        }
    }
}