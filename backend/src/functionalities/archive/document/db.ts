import { db } from '../../../initialization/db';
import type { ArchiveDocument, ArchiveDocumentType, UpdateArchiveDocumentInput, ArchiveDocumentSearchResult } from './models'; // Added ArchiveDocumentSearchResult
import { Log } from '../../log/db';
import { sqliteNow } from '../../../utils/sqlite';
import { SearchQueryElement, SearchOnCustomFieldHandlerResult, SearchRequest, buildSearchQueries } from '../../../utils/search'; // Removed SearchQuery type
import { Tag } from '../../tag/models';
import { getUserByUserId } from '../../user/db';

// Initialization function for the main archive documents table
export async function initializeArchiveDocumentTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS archive_documents (
            archiveDocumentId INTEGER PRIMARY KEY AUTOINCREMENT,
            parentUnitArchiveDocumentId INTEGER,
            ownerUserId INTEGER NOT NULL,
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
            FOREIGN KEY (ownerUserId) REFERENCES users(userId) ON DELETE CASCADE,
            FOREIGN KEY (parentUnitArchiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE SET NULL
        )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_owner ON archive_documents (ownerUserId);`);
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
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_adt_tag ON archive_document_tags (tagId);`);
}

// --- Helper ---
export const dbToArchiveDocument = async (row?: any): Promise<ArchiveDocument | undefined> => {
    if (!row) return undefined;
    try {
        const document: ArchiveDocument = {
            archiveDocumentId: row.archiveDocumentId,
            parentUnitArchiveDocumentId: row.parentUnitArchiveDocumentId,
            ownerUserId: row.ownerUserId,
            type: row.type as ArchiveDocumentType,
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
            tags: row.tags ?? [],
            ownerLogin: row.ownerLogin ?? undefined,
        };

        if (!document.ownerLogin && document.ownerUserId) {
            try {
                const owner = await getUserByUserId(document.ownerUserId);
                document.ownerLogin = owner?.login;
            } catch (ownerError) {
                 await Log.error(`Failed to fetch owner login for doc ${document.archiveDocumentId}, user ${document.ownerUserId}`, "system", "database", ownerError);
            }
        }
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
export async function createArchiveDocument(
    input: Omit<ArchiveDocument, 'archiveDocumentId' | 'createdOn' | 'modifiedOn' | 'active' | 'tags' | 'ownerLogin'>
): Promise<number> {
    const now = sqliteNow();
    const descriptiveJson = JSON.stringify(input.descriptiveSignatureElementIds || []);
    try {
        const statement = db.prepare(
            `INSERT INTO archive_documents (
                parentUnitArchiveDocumentId, ownerUserId, type, topographicSignature,
                descriptiveSignatureElementIds, title, creator, creationDate, numberOfPages, documentType,
                dimensions, binding, condition, documentLanguage, contentDescription, remarks, accessLevel,
                accessConditions, additionalInformation, relatedDocumentsReferences, recordChangeHistory,
                isDigitized, digitizedVersionLink, createdOn, modifiedOn
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING archiveDocumentId`
        );
        const result = statement.get(
            input.parentUnitArchiveDocumentId ?? null, input.ownerUserId, input.type, input.topographicSignature ?? null,
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

export async function getArchiveDocumentById(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT ad.*, u.login as ownerLogin
        FROM archive_documents ad
        LEFT JOIN users u ON ad.ownerUserId = u.userId
        WHERE ad.archiveDocumentId = ? AND ad.active = TRUE
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}

export async function getArchiveDocumentByIdInternal(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT ad.*, u.login as ownerLogin
        FROM archive_documents ad
        LEFT JOIN users u ON ad.ownerUserId = u.userId
        WHERE ad.archiveDocumentId = ?
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}

export async function updateArchiveDocument(
    id: number,
    data: UpdateArchiveDocumentInput
): Promise<ArchiveDocument | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];
    Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || key === 'tagIds' || key === 'descriptiveSignatureElementIds' || key === 'topographicSignature') return;
        let dbKey = key; let dbValue = value;
        if (key === 'isDigitized') dbValue = value ? 1 : 0;
        else if (value === null) dbValue = null;
        if (key === 'ownerUserId') { /* No change needed */ }
        fieldsToUpdate.push(`${dbKey} = ?`);
        params.push(dbValue);
    });
    if (data.topographicSignature !== undefined) {
        fieldsToUpdate.push('topographicSignature = ?');
        params.push(data.topographicSignature);
    }
    if (data.descriptiveSignatureElementIds !== undefined) {
        fieldsToUpdate.push('descriptiveSignatureElementIds = ?');
        params.push(JSON.stringify(data.descriptiveSignatureElementIds));
    }
    if (fieldsToUpdate.length === 0) {
        if (data.tagIds !== undefined) return getArchiveDocumentByIdInternal(id);
        return getArchiveDocumentByIdInternal(id);
    }
    fieldsToUpdate.push('modifiedOn = ?');
    params.push(sqliteNow());
    const query = `UPDATE archive_documents SET ${fieldsToUpdate.join(', ')} WHERE archiveDocumentId = ? RETURNING *`;
    params.push(id);
    try {
        const statement = db.prepare(query);
        statement.get(...params); // RETURNING doesn't give joined ownerLogin
        return getArchiveDocumentByIdInternal(id);
    } catch (error: any) {
        await Log.error('Failed to update archive document', 'system', 'database', { id, data, error });
        throw error;
    }
}

export async function disableArchiveDocument(id: number): Promise<boolean> {
    try {
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

// --- Tag Management ---
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
// Handler for searching by descriptive signatures
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
        // This is trickier with JSON arrays of arrays. We are looking for a sub-array match.
        // This might require iterating through each path in the DB and checking subsequence.
        // For simplicity, we can check if the string representation of the sequence appears.
        // This is not perfectly robust but can be a starting point.
        // Example: path = [2,3], search for docs where a signature is [1,2,3,4] or [7,2,3]
        // This translates to checking if ",2,3," or "[2,3," or ",2,3]" or "[2,3]" (if it's the whole path) is present.

        // We'll search for the sequence as a substring within the stringified JSON array elements.
        // This requires careful construction of the LIKE pattern.
        const sequencePart = signaturePath.join(','); // "2,3"
        // We need to find this sequence within a JSON array string like "[1,2,3,4]" or "[[1,2,3],[4,5,2,3]]"
        // This is complex with simple LIKE.
        // A more robust way for "contains sequence" might need a custom SQLite function or more complex JSON queries.
        // For now, let's implement a simplified version for 'CONTAINS_SEQUENCE' that checks if any path *includes* all elements of signaturePath in order.
        // This is still not a true subsequence but a "starts with" check on sub-paths or exact match of sub-paths.

        // Given the UI "Contains Sequence", it's likely a contiguous subsequence.
        // So, for a signaturePath [2,3], we want to find if ",2,3," or "[2,3," or ",2,3]" or "[2,3]" (as whole path) exists.
        const seqStart = `[${sequencePart}`; // `[2,3`
        const seqMiddle = `,${sequencePart},`; // `,2,3,`
        const seqEnd = `,${sequencePart}]`; // `,2,3]`
        const seqExact = `[${sequencePart}]`; // `[2,3]`

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
export async function getMatchingDocumentIds(searchRequest: SearchRequest): Promise<number[]> {
    try {
        const allowedDirectFields: (keyof ArchiveDocument)[] = [
            'archiveDocumentId', 'parentUnitArchiveDocumentId', 'ownerUserId', 'type', 'title',
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
                'tags': (element, tableAlias) => { /* ... tag handler from controller (or keep it generic) ... */
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