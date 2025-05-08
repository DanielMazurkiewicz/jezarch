import { db } from '../../../initialization/db';
// Removed ArchiveDocumentType import as it's inferred
import type { ArchiveDocument, UpdateArchiveDocumentInput, ArchiveDocumentSearchResult } from './models';
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchQueryElement, SearchOnCustomFieldHandlerResult, SearchRequest, buildSearchQueries } from '../../../utils/search';
import { Tag } from '../../tag/models';
// Removed getUserByUserId import

// Initialization function for the main archive documents table
export async function initializeArchiveDocumentTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS archive_documents (
            archiveDocumentId INTEGER PRIMARY KEY AUTOINCREMENT,
            parentUnitArchiveDocumentId INTEGER,
            createdBy TEXT NOT NULL, -- Changed from ownerUserId
            updatedBy TEXT NOT NULL, -- Added
            type TEXT NOT NULL CHECK(type IN ('unit', 'document')),
            active BOOLEAN NOT NULL DEFAULT TRUE,
            topographicSignature TEXT,
            descriptiveSignatureElementIds TEXT NOT NULL DEFAULT '[]',
            title TEXT NOT NULL,
            creator TEXT NOT NULL,
            creationDate TEXT NOT NULL,
            numberOfPages TEXT,
            documentType TEXT,
            dimensions TEXT,
            binding TEXT,
            condition TEXT,
            documentLanguage TEXT,
            contentDescription TEXT,
            remarks TEXT,
            accessLevel TEXT,
            accessConditions TEXT,
            additionalInformation TEXT,
            relatedDocumentsReferences TEXT,
            recordChangeHistory TEXT,
            isDigitized BOOLEAN NOT NULL DEFAULT FALSE,
            digitizedVersionLink TEXT,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            -- FOREIGN KEY (ownerUserId) REFERENCES users(userId) ON DELETE CASCADE, -- Removed FK
            FOREIGN KEY (parentUnitArchiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE SET NULL
        )
    `);
    // Removed index on ownerUserId
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_created_by ON archive_documents (createdBy);`); // Added index
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_updated_by ON archive_documents (updatedBy);`); // Added index
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_parent ON archive_documents (parentUnitArchiveDocumentId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_type ON archive_documents (type);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_active ON archive_documents (active);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_title ON archive_documents (title);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_content ON archive_documents (contentDescription);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_topo_sig ON archive_documents (topographicSignature);`);
    // Add FTS index for descriptiveSignatureElementIds if SQLite version supports JSON1 extension and it's beneficial
    // Example for FTS5 (if JSON1 is available and structure is flat or you extract relevant parts)
    // await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS archive_documents_fts USING fts5(content='archive_documents', descriptiveSignatureElementIds);`);
    // Or a regular index on the JSON field if you primarily use functions like json_extract with specific paths
    // await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_desc_sig ON archive_documents (json_extract(descriptiveSignatureElementIds, '$'));`);
}

// Initialization function for the document-tag junction table (remains the same)
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
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_adt_tag ON archive_document_tags (tagId);`);
}

// --- Helper ---
export const dbToArchiveDocument = async (row?: any): Promise<ArchiveDocument | undefined> => {
    if (!row) return undefined;
    try {
        const document: ArchiveDocument = {
            archiveDocumentId: row.archiveDocumentId,
            parentUnitArchiveDocumentId: row.parentUnitArchiveDocumentId,
            createdBy: row.createdBy, // Changed from ownerUserId/ownerLogin
            updatedBy: row.updatedBy, // Added
            type: row.type, // No longer need cast if CHECK constraint is reliable
            active: Boolean(row.active),
            topographicSignature: row.topographicSignature ?? null,
            descriptiveSignatureElementIds: JSON.parse(row.descriptiveSignatureElementIds || '[]'),
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
            tags: row.tags ?? [], // Keep tags logic
        };

        // Removed owner login fetching logic

        // Fetch tags if not joined (e.g., after insert/update)
        if (!row.tags && document.archiveDocumentId) {
             try {
                 document.tags = await getTagsForArchiveDocument(document.archiveDocumentId);
             } catch (tagError) {
                 await Log.error(`Failed to fetch tags for archive doc ${document.archiveDocumentId}`, "system", "database", tagError);
             }
        }
        return document;
    } catch (e: any) {
        await Log.error("Failed to parse archive document data from DB", "system", "database", { data: row, error: e.message, stack: e.stack });
        return undefined;
    }
};

// --- Operations ---
// Updated signature to accept createdBy login, removed ownerUserId
export async function createArchiveDocument(
    input: Omit<ArchiveDocument, 'archiveDocumentId' | 'createdOn' | 'modifiedOn' | 'active' | 'tags' | 'updatedBy'> & { createdBy: string }
): Promise<number> {
    const now = sqliteNow();
    const descriptiveJson = JSON.stringify(input.descriptiveSignatureElementIds || []);
    try {
        const statement = db.prepare(
            `INSERT INTO archive_documents (
                parentUnitArchiveDocumentId, createdBy, updatedBy, type, topographicSignature,
                descriptiveSignatureElementIds, title, creator, creationDate, numberOfPages, documentType,
                dimensions, binding, condition, documentLanguage, contentDescription, remarks, accessLevel,
                accessConditions, additionalInformation, relatedDocumentsReferences, recordChangeHistory,
                isDigitized, digitizedVersionLink, createdOn, modifiedOn
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING archiveDocumentId`
        );
        const result = statement.get(
            input.parentUnitArchiveDocumentId ?? null,
            input.createdBy, input.createdBy, // Set both createdBy and updatedBy on creation
            input.type, input.topographicSignature ?? null,
            descriptiveJson, input.title, input.creator, input.creationDate, input.numberOfPages, input.documentType,
            input.dimensions, input.binding, input.condition, input.documentLanguage, input.contentDescription, input.remarks ?? null,
            input.accessLevel, input.accessConditions, input.additionalInformation ?? null, input.relatedDocumentsReferences ?? null,
            input.recordChangeHistory ?? null, input.isDigitized ? 1 : 0, input.digitizedVersionLink ?? null,
            now ?? null, now ?? null
        ) as { archiveDocumentId: number };
        return result.archiveDocumentId;
    } catch (error: any) {
        await Log.error('Failed to create archive document', 'system', 'database', { input, error });
        throw error;
    }
}

// Removed JOIN with users
export async function getArchiveDocumentById(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT * FROM archive_documents
        WHERE archiveDocumentId = ? AND active = TRUE
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}

// Removed JOIN with users
export async function getArchiveDocumentByIdInternal(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT * FROM archive_documents
        WHERE archiveDocumentId = ?
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}

// Updated signature to accept updatedBy login, removed ownerUserId logic
export async function updateArchiveDocument(
    id: number,
    data: UpdateArchiveDocumentInput,
    updatedBy: string // Add updatedBy parameter
): Promise<ArchiveDocument | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
        // Skip fields that are handled separately or not part of core update
        if (value === undefined || key === 'tagIds' || key === 'descriptiveSignatureElementIds') return;

        let dbKey = key; let dbValue = value;
        if (key === 'isDigitized') dbValue = value ? 1 : 0;
        else if (value === null) dbValue = null;
        // Add key to update list
        fieldsToUpdate.push(`${dbKey} = ?`);
        params.push(dbValue);
    });

    // Handle topographicSignature separately (can be null)
    if (data.topographicSignature !== undefined) {
        fieldsToUpdate.push('topographicSignature = ?');
        params.push(data.topographicSignature);
    }

    // Handle descriptiveSignatureElementIds separately
    if (data.descriptiveSignatureElementIds !== undefined) {
        fieldsToUpdate.push('descriptiveSignatureElementIds = ?');
        params.push(JSON.stringify(data.descriptiveSignatureElementIds));
    }

    // Only proceed if there are actual fields to update
    if (fieldsToUpdate.length === 0) {
        // No core data changed, maybe only tags/signatures (handled in controller)
        // Return the current document state
        return getArchiveDocumentByIdInternal(id);
    }

    // Always update modifiedOn and updatedBy
    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());
    fieldsToUpdate.push('updatedBy = ?');
    params.push(updatedBy);

    const query = `UPDATE archive_documents SET ${fieldsToUpdate.join(', ')} WHERE archiveDocumentId = ?`;
    params.push(id);

    try {
        const statement = db.prepare(query);
        statement.run(...params); // Use run as RETURNING * wasn't used effectively before
        // Fetch the updated document with all joined data
        return getArchiveDocumentByIdInternal(id);
    } catch (error: any) {
        await Log.error('Failed to update archive document', 'system', 'database', { id, data, updatedBy, error });
        throw error;
    }
}


export async function disableArchiveDocument(id: number): Promise<boolean> {
    try {
        // Update modifiedOn when disabling
        const statement = db.prepare(`UPDATE archive_documents SET active = FALSE, modifiedOn = ? WHERE archiveDocumentId = ? AND active = TRUE`);
        const result = statement.run(sqliteNow() ?? null, id);
        const disabled = result.changes > 0;
        if (!disabled) {
             const exists = await getArchiveDocumentByIdInternal(id);
             if (exists) await Log.info(`Attempted to disable already inactive document: ${id}`, 'system', 'database');
             else await Log.info(`Attempted to disable non-existent document: ${id}`, 'system', 'database');
        }
        return disabled;
    } catch (error) {
        await Log.error('Failed to disable archive document', 'system', 'database', { id, error });
        throw error;
    }
}

// --- Tag Management (remains the same) ---
export async function getTagsForArchiveDocument(archiveDocumentId: number): Promise<Tag[]> {
    const statement = db.prepare(`SELECT t.* FROM tags t JOIN archive_document_tags adt ON t.tagId = adt.tagId WHERE adt.archiveDocumentId = ? ORDER BY t.name COLLATE NOCASE`);
    return statement.all(archiveDocumentId) as Tag[];
}

export async function getTagsForArchiveDocumentByIds(archiveDocumentIds: number[]): Promise<Map<number, Tag[]>> {
    const tagsMap = new Map<number, Tag[]>();
    if (archiveDocumentIds.length === 0) return tagsMap;
    const placeholders = archiveDocumentIds.map(() => '?').join(',');
    const statement = db.prepare(`SELECT adt.archiveDocumentId, t.* FROM tags t JOIN archive_document_tags adt ON t.tagId = adt.tagId WHERE adt.archiveDocumentId IN (${placeholders}) ORDER BY adt.archiveDocumentId, t.name COLLATE NOCASE`);
    try {
         const rows = statement.all(...archiveDocumentIds) as ({ archiveDocumentId: number } & Tag)[];
         rows.forEach(row => {
             const { archiveDocumentId, ...tagData } = row;
             if (!tagsMap.has(archiveDocumentId)) tagsMap.set(archiveDocumentId, []);
             tagsMap.get(archiveDocumentId)!.push(tagData);
         });
    } catch (error) {
         await Log.error('Failed to bulk fetch tags for archive documents', 'system', 'database', { error });
    }
    return tagsMap;
}

export async function setTagsForArchiveDocument(archiveDocumentId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction((tagsToSet: number[]) => {
        const deleteStmt = db.prepare(`DELETE FROM archive_document_tags WHERE archiveDocumentId = ?`);
        deleteStmt.run(archiveDocumentId);
        if (!tagsToSet || tagsToSet.length === 0) return;
        const insertStmt = db.prepare(`INSERT OR IGNORE INTO archive_document_tags (archiveDocumentId, tagId) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM tags WHERE tagId = ?)`);
        for (const tagId of tagsToSet) {
             if (typeof tagId === 'number' && Number.isInteger(tagId) && tagId > 0) insertStmt.run(archiveDocumentId, tagId, tagId);
             else Log.warn(`Skipping invalid tagId ${tagId} for archive document ${archiveDocumentId}`, 'system', 'database');
        }
    });
    try {
        transaction(tagIds);
    } catch (error) {
         await Log.error('Failed to set tags for archive document', 'system', 'database', { archiveDocumentId, tagIds, error });
         throw error;
    }
}

// --- Search Handlers ---
// Handler for searching by descriptive signatures (remains the same logic)
export const archiveDocumentSignatureSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element, tableAlias
): SearchOnCustomFieldHandlerResult => {
    // This handler is now only for 'descriptiveSignature' field
    if (element.field !== 'descriptiveSignature') return null;

    const value = element.value as unknown; // Value type depends on condition

    // Ensure value is an array of numbers (a single path)
    if (!Array.isArray(value) || !value.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
        Log.warn('Invalid signature path for search', 'system', 'search_handler', { elementValue: value });
        return { whereCondition: element.not ? '1=1' : '1=0', params: [] }; // Invalid path format
    }
    const signaturePath = value as number[];

    if (signaturePath.length === 0 && element.condition !== 'EQ') { // Allow EQ for "has no signature" if empty path means that
        return { whereCondition: element.not ? '1=1' : '1=0', params: [] };
    }

    let whereCondition = '';
    const params: any[] = []; // Allow any type for params

    // Build JSON search patterns based on condition
    if (element.condition === 'EQ') { // Exact match of an entire signature path
        const exactPathJsonString = JSON.stringify(signaturePath);
        whereCondition = `EXISTS (SELECT 1 FROM json_each(${tableAlias}.descriptiveSignatureElementIds) je WHERE je.value = ?)`;
        params.push(exactPathJsonString);
    } else if (element.condition === 'STARTS_WITH') { // Path starts with the given sequence OR is an exact match
        const likePatternPrefix = '[' + signaturePath.join(',') + (signaturePath.length > 0 ? ',' : ''); // e.g., "[1,2," or "["
        const exactPathJsonString = JSON.stringify(signaturePath); // For exact match

        whereCondition = `EXISTS (
            SELECT 1 FROM json_each(${tableAlias}.descriptiveSignatureElementIds) je
            WHERE (je.value LIKE ? ESCAPE '\\' OR je.value = ?)
        )`;
        params.push(likePatternPrefix + '%', exactPathJsonString);
    } else if (element.condition === 'CONTAINS_SEQUENCE') { // Path contains the given sequence ANYWHERE
        const seqStart = `[${signaturePath.join(',')}`;
        const seqMiddle = `,${signaturePath.join(',')},`;
        const seqEnd = `,${signaturePath.join(',')}]`;
        const seqExact = `[${signaturePath.join(',')}]`;

        whereCondition = `EXISTS (
            SELECT 1 FROM json_each(${tableAlias}.descriptiveSignatureElementIds) je
            WHERE (
                je.value LIKE ? OR je.value LIKE ? OR je.value LIKE ? OR je.value = ?
            )
        )`;
        params.push(seqStart + '%', '%' + seqMiddle + '%', '%' + seqEnd, seqExact);
    } else {
        Log.warn('Unsupported condition for descriptiveSignature search', 'system', 'search_handler', { condition: element.condition });
        return null; // Or throw error
    }

    if (element.not) {
        whereCondition = `NOT (${whereCondition})`;
    }

    return { whereCondition: `(${whereCondition})`, params };
};


// --- Batch Tagging DB Functions ---
// Updated allowedFields
export async function getMatchingDocumentIds(searchRequest: SearchRequest): Promise<number[]> {
    try {
        const allowedDirectFields: (keyof ArchiveDocument)[] = [
            'archiveDocumentId', 'parentUnitArchiveDocumentId', 'createdBy', 'updatedBy', 'type', 'title', // Changed fields
            'creator', 'creationDate', 'numberOfPages', 'documentType', 'dimensions', 'binding',
            'condition', 'documentLanguage', 'contentDescription', 'remarks', 'accessLevel',
            'accessConditions', 'additionalInformation', 'relatedDocumentsReferences',
            'isDigitized', 'digitizedVersionLink', 'createdOn', 'modifiedOn', 'active',
            'topographicSignature'
        ];
        const primaryKey = 'archiveDocumentId';
        const { countQuery, alias } = await buildSearchQueries<ArchiveDocumentSearchResult>(
            'archive_documents',
            { ...searchRequest, page: 1, pageSize: -1 },
            allowedDirectFields,
            {
                'tags': (element, tableAlias) => {
                    if (element.field === 'tags' && element.condition === 'ANY_OF' && Array.isArray(element.value)) {
                        const tagIds = element.value.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
                        if (tagIds.length === 0) return { whereCondition: element.not ? '1=1' : '1=0', params: [] };
                        const placeholders = tagIds.map(() => '?').join(', ');
                        const whereCondition = `${element.not ? 'NOT ' : ''}EXISTS ( SELECT 1 FROM archive_document_tags adt WHERE adt.archiveDocumentId = ${tableAlias}.archiveDocumentId AND adt.tagId IN (${placeholders}) )`;
                        return { whereCondition, params: tagIds };
                    }
                    return null;
                },
                'descriptiveSignature': archiveDocumentSignatureSearchHandler,
                // No handler needed for createdBy/updatedBy as they are direct fields
            },
            primaryKey
        );
        const idSelectQuery = countQuery.sql.replace(`SELECT COUNT(DISTINCT ${alias}.${primaryKey}) as total`, `SELECT DISTINCT ${alias}.${primaryKey} as id`);
        const statement = db.prepare(idSelectQuery);
        const rows = statement.all(...countQuery.params) as { id: number }[];
        return rows.map(row => row.id);
    } catch (error: any) {
        await Log.error('Failed to get matching document IDs for batch tagging', 'system', 'database', { searchRequest, error });
        throw error;
    }
}

export async function addTagsToDocuments(documentIds: number[], tagIds: number[]): Promise<number> {
    if (documentIds.length === 0 || tagIds.length === 0) return 0;
    let changes = 0;
    const transaction = db.transaction(() => {
        const insertStmt = db.prepare(`INSERT OR IGNORE INTO archive_document_tags (archiveDocumentId, tagId) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM archive_documents WHERE archiveDocumentId = ?) AND EXISTS (SELECT 1 FROM tags WHERE tagId = ?)`);
        for (const docId of documentIds) for (const tagId of tagIds) { const result = insertStmt.run(docId, tagId, docId, tagId); changes += result.changes; }
    });
    try { transaction(); return changes; }
    catch (error) { await Log.error('Failed to batch add tags to documents', 'system', 'database', { documentIds, tagIds, error }); throw error; }
}

export async function removeTagsFromDocuments(documentIds: number[], tagIds: number[]): Promise<number> {
     if (documentIds.length === 0 || tagIds.length === 0) return 0;
    let changes = 0;
    const transaction = db.transaction(() => {
        const docPlaceholders = documentIds.map(() => '?').join(',');
        const tagPlaceholders = tagIds.map(() => '?').join(',');
        const deleteStmt = db.prepare(`DELETE FROM archive_document_tags WHERE archiveDocumentId IN (${docPlaceholders}) AND tagId IN (${tagPlaceholders})`);
        const result = deleteStmt.run(...documentIds, ...tagIds); changes = result.changes;
    });
    try { transaction(); return changes; }
    catch (error) { await Log.error('Failed to batch remove tags from documents', 'system', 'database', { documentIds, tagIds, error }); throw error; }
}