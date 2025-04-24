
import { db } from '../../../initialization/db';
import type { ArchiveDocument, SignatureElementIdPath, ArchiveDocumentType, UpdateArchiveDocumentInput } from './models';
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchQueryElement, SearchOnCustomFieldHandlerResult } from '../../../utils/search';
import { Tag } from '../../tag/models';
import {  getUserByUserId } from '../../user/db'; // Added user imports for ownerLogin

// Initialization function for the main archive documents table
export async function initializeArchiveDocumentTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS archive_documents (
            archiveDocumentId INTEGER PRIMARY KEY AUTOINCREMENT,
            parentUnitArchiveDocumentId INTEGER, -- Nullable FK to self
            ownerUserId INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('unit', 'document')),
            active BOOLEAN NOT NULL DEFAULT TRUE,

            -- Signatures stored as JSON text
            topographicSignatureElementIds TEXT NOT NULL DEFAULT '[]', -- JSON array of arrays: [[id1, id2], [id3]]
            descriptiveSignatureElementIds TEXT NOT NULL DEFAULT '[]', -- JSON array of arrays

            -- Core metadata
            title TEXT NOT NULL,
            creator TEXT NOT NULL,
            creationDate TEXT NOT NULL, -- Store as text for flexibility
            numberOfPages TEXT,
            documentType TEXT,
            dimensions TEXT,
            binding TEXT,
            condition TEXT,
            documentLanguage TEXT,
            contentDescription TEXT,

            -- Optional metadata
            remarks TEXT,
            accessLevel TEXT,
            accessConditions TEXT,
            additionalInformation TEXT,
            relatedDocumentsReferences TEXT,
            recordChangeHistory TEXT,

            -- Digitization
            isDigitized BOOLEAN NOT NULL DEFAULT FALSE,
            digitizedVersionLink TEXT,

            -- Timestamps
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (ownerUserId) REFERENCES users(userId),
            FOREIGN KEY (parentUnitArchiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE SET NULL -- Or CASCADE? Decide policy. SET NULL allows reparenting.
        )
    `);
    // Indexes for common lookups
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_owner ON archive_documents (ownerUserId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_parent ON archive_documents (parentUnitArchiveDocumentId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_type ON archive_documents (type);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_active ON archive_documents (active);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_title ON archive_documents (title);`); // For searching/sorting
}

// Initialization function for the document-tag junction table
export async function initializeArchiveDocumentTagTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS archive_document_tags (
            archiveDocumentId INTEGER NOT NULL,
            tagId INTEGER NOT NULL,
            PRIMARY KEY (archiveDocumentId, tagId),
            FOREIGN KEY (archiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE CASCADE,
            FOREIGN KEY (tagId) REFERENCES tags(tagId) ON DELETE CASCADE
        )
    `);
}


// --- Helper ---
// Now accepts an optional row argument and joins with users for ownerLogin
export const dbToArchiveDocument = async (row?: any): Promise<ArchiveDocument | undefined> => {
    if (!row) return undefined;
    try {
        const document: ArchiveDocument = {
            archiveDocumentId: row.archiveDocumentId,
            parentUnitArchiveDocumentId: row.parentUnitArchiveDocumentId,
            ownerUserId: row.ownerUserId,
            type: row.type as ArchiveDocumentType,
            active: Boolean(row.active),
            // Parse JSON signature arrays
            topographicSignatureElementIds: JSON.parse(row.topographicSignatureElementIds || '[]') as SignatureElementIdPath[],
            descriptiveSignatureElementIds: JSON.parse(row.descriptiveSignatureElementIds || '[]') as SignatureElementIdPath[],
            title: row.title,
            creator: row.creator,
            creationDate: row.creationDate,
            numberOfPages: row.numberOfPages,
            documentType: row.documentType,
            dimensions: row.dimensions,
            binding: row.binding,
            condition: row.condition,
            documentLanguage: row.documentLanguage,
            contentDescription: row.contentDescription,
            remarks: row.remarks,
            accessLevel: row.accessLevel,
            accessConditions: row.accessConditions,
            additionalInformation: row.additionalInformation,
            relatedDocumentsReferences: row.relatedDocumentsReferences,
            recordChangeHistory: row.recordChangeHistory,
            isDigitized: Boolean(row.isDigitized),
            digitizedVersionLink: row.digitizedVersionLink,
            createdOn: new Date(row.createdOn),
            modifiedOn: new Date(row.modifiedOn),
            // tags and ownerLogin will be populated separately or via JOIN
            tags: row.tags ?? [], // Initialize if not present
            ownerLogin: row.ownerLogin ?? undefined, // Map from JOIN if present
        };

        // If ownerLogin wasn't joined, fetch it (less efficient but ensures it's populated)
        if (!document.ownerLogin && document.ownerUserId) {
            const owner = await getUserByUserId(document.ownerUserId);
            document.ownerLogin = owner?.login;
        }

        // If tags weren't joined/populated, fetch them (less efficient)
        // This part might be redundant if the calling function populates tags separately
        if (!row.tags && document.archiveDocumentId) {
             try {
                 document.tags = await getTagsForArchiveDocument(document.archiveDocumentId);
             } catch (tagError) {
                 await Log.error(`Failed to fetch tags for archive doc ${document.archiveDocumentId}`, "system", "database", tagError);
             }
        }


        return document;
    } catch (e) {
        await Log.error("Failed to parse archive document data from DB", "system", "database", { data: row, error: e });
        return undefined; // Return undefined if parsing fails
    }
};

// --- Operations ---

export async function createArchiveDocument(
    input: Omit<ArchiveDocument, 'archiveDocumentId' | 'createdOn' | 'modifiedOn' | 'active' | 'tags' | 'ownerLogin'>
): Promise<number> {
    const now = sqliteNow();
    const topographicJson = JSON.stringify(input.topographicSignatureElementIds || []);
    const descriptiveJson = JSON.stringify(input.descriptiveSignatureElementIds || []);

    try {
        const statement = db.prepare(
            `INSERT INTO archive_documents (
                parentUnitArchiveDocumentId, ownerUserId, type, topographicSignatureElementIds, descriptiveSignatureElementIds,
                title, creator, creationDate, numberOfPages, documentType, dimensions, binding, condition,
                documentLanguage, contentDescription, remarks, accessLevel, accessConditions, additionalInformation,
                relatedDocumentsReferences, recordChangeHistory, isDigitized, digitizedVersionLink, createdOn, modifiedOn
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING archiveDocumentId`
        );
        const result = statement.get(
            input.parentUnitArchiveDocumentId ?? null, input.ownerUserId, input.type, topographicJson, descriptiveJson,
            input.title, input.creator, input.creationDate, input.numberOfPages, input.documentType, input.dimensions,
            input.binding, input.condition, input.documentLanguage, input.contentDescription, input.remarks ?? null,
            input.accessLevel, input.accessConditions, input.additionalInformation ?? null, input.relatedDocumentsReferences ?? null,
            input.recordChangeHistory ?? null, input.isDigitized ? 1 : 0, input.digitizedVersionLink ?? null,
            now ?? null, now ?? null
        ) as { archiveDocumentId: number };
        return result.archiveDocumentId;
    } catch (error: any) {
        await Log.error('Failed to create archive document', 'system', 'database', { input, error });
        throw error; // Re-throw for controller
    }
}

// Gets ACTIVE document by ID, joins with users for ownerLogin
export async function getArchiveDocumentById(id: number): Promise<ArchiveDocument | undefined> {
    // Fetch only active documents by default through this getter
     const statement = db.prepare(`
        SELECT ad.*, u.login as ownerLogin
        FROM archive_documents ad
        JOIN users u ON ad.ownerUserId = u.userId
        WHERE ad.archiveDocumentId = ? AND ad.active = TRUE
    `);
    const row = statement.get(id);
    // dbToArchiveDocument doesn't need to fetch tags/ownerLogin again if JOINed
    return await dbToArchiveDocument(row);
}

// Get document regardless of active status, joins with users for ownerLogin
export async function getArchiveDocumentByIdInternal(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT ad.*, u.login as ownerLogin
        FROM archive_documents ad
        JOIN users u ON ad.ownerUserId = u.userId
        WHERE ad.archiveDocumentId = ?
    `);
    const row = statement.get(id);
     // dbToArchiveDocument doesn't need to fetch tags/ownerLogin again if JOINed
    return await dbToArchiveDocument(row);
}


export async function updateArchiveDocument(
    id: number,
    data: UpdateArchiveDocumentInput
): Promise<ArchiveDocument | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    // Map input fields to DB columns, handling JSON serialization
    Object.entries(data).forEach(([key, value]) => {
        // Skip fields handled separately or undefined
        if (value === undefined || key === 'tagIds' || key === 'topographicSignatureElementIds' || key === 'descriptiveSignatureElementIds') return;

        let dbKey = key;
        let dbValue = value;

        if (key === 'isDigitized') {
            dbValue = value ? 1 : 0;
        } else if (value === null) {
             dbValue = null; // Pass explicit nulls
        }
         // Add mapping for other keys if needed (e.g., different input vs db names)

        fieldsToUpdate.push(`${dbKey} = ?`);
        params.push(dbValue);
    });

    // Handle JSON fields separately to ensure they are always included if present in input, even if empty array
    if (data.topographicSignatureElementIds !== undefined) {
        fieldsToUpdate.push('topographicSignatureElementIds = ?');
        params.push(JSON.stringify(data.topographicSignatureElementIds));
    }
    if (data.descriptiveSignatureElementIds !== undefined) {
        fieldsToUpdate.push('descriptiveSignatureElementIds = ?');
        params.push(JSON.stringify(data.descriptiveSignatureElementIds));
    }


    if (fieldsToUpdate.length === 0) {
        // Check if only tags were potentially changed (tagIds handled by controller)
        if (data.tagIds !== undefined) {
             // Fetch current state as no core fields changed, tags handled separately
             return getArchiveDocumentByIdInternal(id);
        }
        // No core fields or JSON fields changed
        return getArchiveDocumentByIdInternal(id);
    }

    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());

    const query = `
        UPDATE archive_documents
        SET ${fieldsToUpdate.join(', ')}
        WHERE archiveDocumentId = ?
        RETURNING *
    `;
    params.push(id);

    try {
        const statement = db.prepare(query);
        const updatedRow = statement.get(...params);
        // Need to fetch ownerLogin separately as RETURNING doesn't join
        const result = await dbToArchiveDocument(updatedRow);
        // Fetch again to get joined ownerLogin if needed (or pass it if already known)
        return getArchiveDocumentByIdInternal(id); // Return the final state with ownerLogin
    } catch (error: any) {
        await Log.error('Failed to update archive document', 'system', 'database', { id, data, error });
        throw error; // Re-throw for controller
    }
}

// Soft delete
export async function disableArchiveDocument(id: number): Promise<boolean> {
    try {
        const statement = db.prepare(
            `UPDATE archive_documents
             SET active = FALSE, modifiedOn = ?
             WHERE archiveDocumentId = ? AND active = TRUE` // Ensure we only disable active ones
        );
        const result = statement.run(sqliteNow() ?? null, id);
        const disabled = result.changes > 0;
        if (!disabled) {
             // Could be already inactive or non-existent
             const exists = await getArchiveDocumentByIdInternal(id);
             if (exists) {
                 await Log.info(`Attempted to disable already inactive document: ${id}`, 'system', 'database');
             } else {
                 await Log.info(`Attempted to disable non-existent document: ${id}`, 'system', 'database');
             }
        }
        return disabled;
    } catch (error) {
        await Log.error('Failed to disable archive document', 'system', 'database', { id, error });
        throw error;
    }
}

// Potentially add functions like:
// - getAllArchiveDocumentsByOwnerUserId(ownerUserId: number) -> Promise<ArchiveDocument[]>
// - getChildDocuments(parentUnitId: number) -> Promise<ArchiveDocument[]>


// --- Tag Management ---
export async function getTagsForArchiveDocument(archiveDocumentId: number): Promise<Tag[]> {
    const statement = db.prepare(`
        SELECT t.* FROM tags t
        JOIN archive_document_tags adt ON t.tagId = adt.tagId
        WHERE adt.archiveDocumentId = ?
        ORDER BY t.name
    `);
    return statement.all(archiveDocumentId) as Tag[];
}

export async function setTagsForArchiveDocument(archiveDocumentId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction((tagsToSet: number[]) => { // Synchronous transaction function
        const deleteStmt = db.prepare(`DELETE FROM archive_document_tags WHERE archiveDocumentId = ?`);
        deleteStmt.run(archiveDocumentId);

        if (!tagsToSet || tagsToSet.length === 0) {
            return;
        }

        // Ensure tags exist before inserting? Optional, adds overhead.
        const insertStmt = db.prepare(`INSERT OR IGNORE INTO archive_document_tags (archiveDocumentId, tagId) VALUES (?, ?)`);
        for (const tagId of tagsToSet) {
             // Consider checking if tagId exists in 'tags' table first if strictness is needed
            insertStmt.run(archiveDocumentId, tagId);
        }
    });

    try {
        transaction(tagIds); // Execute the synchronous transaction
    } catch (error) {
         await Log.error('Failed to set tags for archive document', 'system', 'database', { archiveDocumentId, tagIds, error });
         throw error;
    }
}


// --- Search Handlers ---

// Handler for searching by tags (similar to notes)
export const archiveDocumentTagSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element, tableAlias
): SearchOnCustomFieldHandlerResult => {
    if (element.field === 'tags' && element.condition === 'ANY_OF' && Array.isArray(element.value)) {
        const tagIds = element.value.filter(id => typeof id === 'number' && Number.isInteger(id) && id > 0);
        if (tagIds.length === 0) return { whereCondition: element.not ? '1=1' : '1=0', params: [] };

        const placeholders = tagIds.map(() => '?').join(', ');
        // Use EXISTS for potentially better performance than JOIN on large tables
        const whereCondition = `
            ${element.not ? 'NOT ' : ''}EXISTS (
                SELECT 1 FROM archive_document_tags adt
                WHERE adt.archiveDocumentId = ${tableAlias}.archiveDocumentId
                AND adt.tagId IN (${placeholders})
            )
        `;

        return { whereCondition, params: tagIds };
    }
    return null;
};


// Handler for searching by signature prefix
export const archiveDocumentSignatureSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element, tableAlias
): SearchOnCustomFieldHandlerResult => {
    const signatureFieldMap: Record<string, string> = {
        'topographicSignaturePrefix': 'topographicSignatureElementIds',
        'descriptiveSignaturePrefix': 'descriptiveSignatureElementIds',
    };

    const dbColumn = signatureFieldMap[element.field];

    // We handle ANY_OF condition where value is an array of ID paths (prefixes)
    // Example: field: 'topographicSignaturePrefix', condition: 'ANY_OF', value: [[1, 5], [2, 8, 3]]
    // Example: field: 'topographicSignaturePrefix', condition: 'EQ', value: [1, 5] (Search for exact full signature)
    const value = element.value as unknown as number[][] | number[]; // Allow single path for EQ

    if (!dbColumn) return null;

    if (element.condition === 'ANY_OF' && Array.isArray(value)) {
         // Ensure value is array of arrays for ANY_OF
         const validPrefixes = (value as number[][])
             .filter(path => Array.isArray(path) && path.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0))


         if (validPrefixes.length === 0) {
             return { whereCondition: element.not ? '1=1' : '1=0', params: [] };
         }

         const conditions: string[] = [];
         const params: string[] = [];

         validPrefixes.forEach(prefix => {
             // Simple JSON string prefix matching using LIKE
             // Matches '[1,5,...' for prefix [1, 5]
             // Also matches exact '[1,5]'
             const likePatternPrefix = '[' + prefix.join(',') + (prefix.length > 0 ? ',' : ''); // e.g., "[1,5," or "["
             const likePatternExact = '[' + prefix.join(',') + ']'; // e.g., "[1,5]"

             // Condition for a single prefix: Check if *any* signature in the JSON array starts with this prefix
             // This uses json_each to iterate through the outer array of signatures.
             // It checks if the string representation of the signature path starts with the pattern.
             conditions.push(`
                 EXISTS (
                     SELECT 1 FROM json_each(${tableAlias}.${dbColumn}) je
                     WHERE (je.value LIKE ? OR je.value = ?)
                 )
             `);
             params.push(likePatternPrefix + '%', likePatternExact);

             // SQLite LIKE is case-sensitive by default unless overridden by PRAGMA.
             // JSON string matching here is inherently exact on numbers/commas/brackets.
         });

         // Combine conditions for multiple prefixes with OR
         let combinedCondition = conditions.join(' OR ');
         if (element.not) {
             combinedCondition = `NOT (${combinedCondition})`;
         }

         return {
             whereCondition: `(${combinedCondition})`, // Wrap in parentheses
             params: params // Pass all LIKE patterns
         };
    }
     // --- Added EQ Condition Handler ---
    else if (element.condition === 'EQ' && Array.isArray(value)) {
        // Ensure value is a single array of numbers for EQ
        const exactPath = value as number[];
        if (!exactPath.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
            return { whereCondition: element.not ? '1=1' : '1=0', params: [] }; // Invalid path format
        }
        const exactPathJsonString = JSON.stringify(exactPath); // e.g., "[1,5]"

        // Condition for exact path match: Check if the JSON string exists within the JSON array
        // Use json_each for iteration.
        const whereCondition = `
            ${element.not ? 'NOT ' : ''}EXISTS (
                SELECT 1 FROM json_each(${tableAlias}.${dbColumn}) je
                WHERE je.value = ?
            )
        `;
        return {
            whereCondition: `(${whereCondition})`,
            params: [exactPathJsonString]
        };
    }
    // --- End EQ Condition Handler ---

    return null; // Handler doesn't apply to this field/condition/value type
};
