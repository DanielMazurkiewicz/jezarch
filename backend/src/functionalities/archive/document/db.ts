import { db } from '../../../initialization/db';
import type { ArchiveDocument, SignatureElementIdPath, ArchiveDocumentType, UpdateArchiveDocumentInput } from './models';
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchQueryElement, SearchOnCustomFieldHandlerResult } from '../../../utils/search';
import { Tag } from '../../tag/models';

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
export const dbToArchiveDocument = (data: any): ArchiveDocument | undefined => {
    if (!data) return undefined;
    try {
        return {
            archiveDocumentId: data.archiveDocumentId,
            parentUnitArchiveDocumentId: data.parentUnitArchiveDocumentId,
            ownerUserId: data.ownerUserId,
            type: data.type as ArchiveDocumentType,
            active: Boolean(data.active),
            // Parse JSON signature arrays
            topographicSignatureElementIds: JSON.parse(data.topographicSignatureElementIds || '[]') as SignatureElementIdPath[],
            descriptiveSignatureElementIds: JSON.parse(data.descriptiveSignatureElementIds || '[]') as SignatureElementIdPath[],
            title: data.title,
            creator: data.creator,
            creationDate: data.creationDate,
            numberOfPages: data.numberOfPages,
            documentType: data.documentType,
            dimensions: data.dimensions,
            binding: data.binding,
            condition: data.condition,
            documentLanguage: data.documentLanguage,
            contentDescription: data.contentDescription,
            remarks: data.remarks,
            accessLevel: data.accessLevel,
            accessConditions: data.accessConditions,
            additionalInformation: data.additionalInformation,
            relatedDocumentsReferences: data.relatedDocumentsReferences,
            recordChangeHistory: data.recordChangeHistory,
            isDigitized: Boolean(data.isDigitized),
            digitizedVersionLink: data.digitizedVersionLink,
            createdOn: new Date(data.createdOn),
            modifiedOn: new Date(data.modifiedOn),
            // tags will be populated separately
        } as ArchiveDocument;
    } catch (e) {
        Log.error("Failed to parse archive document data from DB", "system", "database", { data, error: e });
        return undefined; // Return undefined if parsing fails
    }
};

// --- Operations ---

export async function createArchiveDocument(
    input: Omit<ArchiveDocument, 'archiveDocumentId' | 'createdOn' | 'modifiedOn' | 'active' | 'tags'>
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

export async function getArchiveDocumentById(id: number): Promise<ArchiveDocument | undefined> {
    // Fetch only active documents by default through this getter
    const statement = db.prepare(`SELECT * FROM archive_documents WHERE archiveDocumentId = ? AND active = TRUE`);
    const row = statement.get(id);
    return dbToArchiveDocument(row);
}

// Get document regardless of active status (for admin/internal use)
export async function getArchiveDocumentByIdInternal(id: number): Promise<ArchiveDocument | undefined> {
    const statement = db.prepare(`SELECT * FROM archive_documents WHERE archiveDocumentId = ?`);
    const row = statement.get(id);
    return dbToArchiveDocument(row);
}


export async function updateArchiveDocument(
    id: number,
    data: UpdateArchiveDocumentInput
): Promise<ArchiveDocument | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    // Map input fields to DB columns, handling JSON serialization
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined) return; // Skip undefined fields (PATCH semantics)

        let dbKey = key;
        let dbValue = value;

        if (key === 'tagIds') return; // Handled separately

        if (key === 'topographicSignatureElementIds' || key === 'descriptiveSignatureElementIds') {
            dbValue = JSON.stringify(value);
        } else if (key === 'isDigitized') {
            dbValue = value ? 1 : 0;
        } else if (value === null) {
             dbValue = null; // Pass explicit nulls
        }
         // Add mapping for other keys if needed (e.g., different input vs db names)

        fieldsToUpdate.push(`${dbKey} = ?`);
        params.push(dbValue);
    });


    if (fieldsToUpdate.length === 0) {
        return getArchiveDocumentByIdInternal(id); // No changes, return current state
    }

    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());

    const query = `UPDATE archive_documents SET ${fieldsToUpdate.join(', ')} WHERE archiveDocumentId = ? RETURNING *`;
    params.push(id);

    try {
        const statement = db.prepare(query);
        const updatedRow = statement.get(...params);
        return dbToArchiveDocument(updatedRow);
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
    const transaction = db.transaction(async (tagsToSet: number[]) => {
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
        await transaction(tagIds);
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
        const joinClause = `INNER JOIN archive_document_tags adt ON ${tableAlias}.archiveDocumentId = adt.archiveDocumentId`;
        const whereCondition = `adt.tagId ${element.not ? 'NOT ' : ''}IN (${placeholders})`;

        return { joinClause, whereCondition, params: tagIds };
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
    const value = element.value as unknown as number[][]
    if (dbColumn && element.condition === 'ANY_OF' && Array.isArray(value)) {
        const validPrefixes = value
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
                    WHERE je.value LIKE ? OR je.value = ?
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

    return null; // Handler doesn't apply to this field/condition/value type
};