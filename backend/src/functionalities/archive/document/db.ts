import { db } from '../../../initialization/db';
// --- UPDATED: Removed SignatureElementIdPath, updated UpdateInput ---
import type { ArchiveDocument, ArchiveDocumentType, UpdateArchiveDocumentInput } from './models';
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

            -- --- UPDATED: Simple text field for topographic signature ---
            topographicSignature TEXT,
            -- Kept descriptive signature as JSON
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

            FOREIGN KEY (ownerUserId) REFERENCES users(userId) ON DELETE CASCADE, -- Cascade delete documents if owner is deleted
            FOREIGN KEY (parentUnitArchiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE SET NULL -- Or CASCADE? Decide policy. SET NULL allows reparenting.
        )
    `);
    // Indexes for common lookups
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_owner ON archive_documents (ownerUserId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_parent ON archive_documents (parentUnitArchiveDocumentId);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_type ON archive_documents (type);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_active ON archive_documents (active);`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_title ON archive_documents (title);`); // For searching/sorting
    // Add index for searching by content description (can be large, consider FTS if needed)
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_content ON archive_documents (contentDescription);`);
     // --- ADDED: Index for topographicSignature string ---
     await db.exec(`CREATE INDEX IF NOT EXISTS idx_ad_topo_sig ON archive_documents (topographicSignature);`);
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
    // Index for faster tag lookups per document (covered by PK)
    // Index for faster document lookups per tag (important for tag-based searches)
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_adt_tag ON archive_document_tags (tagId);`);
}


// --- Helper ---
// Parses DB row into ArchiveDocument object, handling potential JSON errors
export const dbToArchiveDocument = async (row?: any): Promise<ArchiveDocument | undefined> => {
    if (!row) return undefined;
    try {
        const document: ArchiveDocument = {
            archiveDocumentId: row.archiveDocumentId,
            parentUnitArchiveDocumentId: row.parentUnitArchiveDocumentId,
            ownerUserId: row.ownerUserId,
            type: row.type as ArchiveDocumentType,
            active: Boolean(row.active),
            // --- UPDATED: Read topographic signature as string ---
            topographicSignature: row.topographicSignature ?? null, // Default to null if undefined/null in DB
            // --- Kept descriptive signature parsing ---
            descriptiveSignatureElementIds: JSON.parse(row.descriptiveSignatureElementIds || '[]'), // Parse JSON safely
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
            try {
                const owner = await getUserByUserId(document.ownerUserId);
                document.ownerLogin = owner?.login;
            } catch (ownerError) {
                 await Log.error(`Failed to fetch owner login for doc ${document.archiveDocumentId}, user ${document.ownerUserId}`, "system", "database", ownerError);
            }
        }

        // Tags are typically populated by the calling function (e.g., controller after search)
        // to allow for optimized bulk fetching. This fallback is less efficient.
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
        return undefined; // Return undefined if parsing fails
    }
};

// --- Operations ---

export async function createArchiveDocument(
    // --- UPDATED: Input type adjusted (topographicSignature now string) ---
    input: Omit<ArchiveDocument, 'archiveDocumentId' | 'createdOn' | 'modifiedOn' | 'active' | 'tags' | 'ownerLogin'>
): Promise<number> {
    const now = sqliteNow();
    // --- REMOVED: Topographic JSON stringify ---
    const descriptiveJson = JSON.stringify(input.descriptiveSignatureElementIds || []);

    try {
        const statement = db.prepare(
            `INSERT INTO archive_documents (
                parentUnitArchiveDocumentId, ownerUserId, type,
                -- --- UPDATED: Insert topographicSignature directly ---
                topographicSignature,
                descriptiveSignatureElementIds,
                title, creator, creationDate, numberOfPages, documentType, dimensions, binding, condition,
                documentLanguage, contentDescription, remarks, accessLevel, accessConditions, additionalInformation,
                relatedDocumentsReferences, recordChangeHistory, isDigitized, digitizedVersionLink, createdOn, modifiedOn
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING archiveDocumentId`
        );
        const result = statement.get(
            input.parentUnitArchiveDocumentId ?? null, input.ownerUserId, input.type,
            // --- UPDATED: Pass topographicSignature string (or null) ---
            input.topographicSignature ?? null,
            descriptiveJson,
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
        LEFT JOIN users u ON ad.ownerUserId = u.userId -- Use LEFT JOIN in case user was deleted but doc remains temporarily
        WHERE ad.archiveDocumentId = ? AND ad.active = TRUE
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}

// Get document regardless of active status, joins with users for ownerLogin
export async function getArchiveDocumentByIdInternal(id: number): Promise<ArchiveDocument | undefined> {
     const statement = db.prepare(`
        SELECT ad.*, u.login as ownerLogin
        FROM archive_documents ad
        LEFT JOIN users u ON ad.ownerUserId = u.userId -- Use LEFT JOIN in case user was deleted
        WHERE ad.archiveDocumentId = ?
    `);
    const row = statement.get(id);
    return await dbToArchiveDocument(row);
}


export async function updateArchiveDocument(
    id: number,
    data: UpdateArchiveDocumentInput // Type already updated in models.ts
): Promise<ArchiveDocument | undefined> {
    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    // Map input fields to DB columns, handling JSON serialization and topographic string
    Object.entries(data).forEach(([key, value]) => {
        // --- UPDATED: Skip topographicSignature here, handle below ---
        if (value === undefined || key === 'tagIds' || key === 'descriptiveSignatureElementIds' || key === 'topographicSignature') return;

        let dbKey = key;
        let dbValue = value;

        if (key === 'isDigitized') {
            dbValue = value ? 1 : 0;
        } else if (value === null) {
             dbValue = null; // Pass explicit nulls
        }
         // Add mapping for other keys if needed (e.g., different input vs db names)
         if (key === 'ownerUserId') { /* No change needed */ }

        fieldsToUpdate.push(`${dbKey} = ?`);
        params.push(dbValue);
    });

    // --- UPDATED: Handle topographicSignature string field ---
    if (data.topographicSignature !== undefined) { // Check for undefined to allow setting to null
        fieldsToUpdate.push('topographicSignature = ?');
        params.push(data.topographicSignature); // Pass string or null
    }
    // --- Kept descriptive signature handling ---
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
        // No core fields or JSON/string fields changed
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
        // RETURNING * doesn't include joined ownerLogin.
        // Fetch again to get the full object including ownerLogin.
        return getArchiveDocumentByIdInternal(id); // Return the final state with ownerLogin
    } catch (error: any) {
        await Log.error('Failed to update archive document', 'system', 'database', { id, data, error });
        throw error; // Re-throw for controller
    }
}

// Soft delete (unchanged)
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


// --- Tag Management (unchanged) ---
export async function getTagsForArchiveDocument(archiveDocumentId: number): Promise<Tag[]> {
    const statement = db.prepare(`
        SELECT t.* FROM tags t
        JOIN archive_document_tags adt ON t.tagId = adt.tagId
        WHERE adt.archiveDocumentId = ?
        ORDER BY t.name COLLATE NOCASE -- Added case-insensitive sort
    `);
    return statement.all(archiveDocumentId) as Tag[];
}

export async function getTagsForArchiveDocumentByIds(archiveDocumentIds: number[]): Promise<Map<number, Tag[]>> {
    const tagsMap = new Map<number, Tag[]>();
    if (archiveDocumentIds.length === 0) return tagsMap;

    const placeholders = archiveDocumentIds.map(() => '?').join(',');
    const statement = db.prepare(`
        SELECT adt.archiveDocumentId, t.*
        FROM tags t
        JOIN archive_document_tags adt ON t.tagId = adt.tagId
        WHERE adt.archiveDocumentId IN (${placeholders})
        ORDER BY adt.archiveDocumentId, t.name COLLATE NOCASE
    `);

    try {
         const rows = statement.all(...archiveDocumentIds) as ({ archiveDocumentId: number } & Tag)[];
         rows.forEach(row => {
             const { archiveDocumentId, ...tagData } = row;
             if (!tagsMap.has(archiveDocumentId)) {
                 tagsMap.set(archiveDocumentId, []);
             }
             tagsMap.get(archiveDocumentId)!.push(tagData);
         });
    } catch (error) {
         await Log.error('Failed to bulk fetch tags for archive documents', 'system', 'database', { error });
         // Return empty map on error? Or rethrow?
    }

    return tagsMap;
}


export async function setTagsForArchiveDocument(archiveDocumentId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction((tagsToSet: number[]) => { // Synchronous transaction function
        const deleteStmt = db.prepare(`DELETE FROM archive_document_tags WHERE archiveDocumentId = ?`);
        deleteStmt.run(archiveDocumentId);

        if (!tagsToSet || tagsToSet.length === 0) {
            return;
        }

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO archive_document_tags (archiveDocumentId, tagId)
            SELECT ?, ?
            WHERE EXISTS (SELECT 1 FROM tags WHERE tagId = ?) -- Ensure tag exists
        `);
        for (const tagId of tagsToSet) {
             // Consider checking if tagId exists in 'tags' table first if strictness is needed
             if (typeof tagId === 'number' && Number.isInteger(tagId) && tagId > 0) {
                 insertStmt.run(archiveDocumentId, tagId, tagId); // Pass tagId again for EXISTS check
             } else {
                 Log.warn(`Skipping invalid tagId ${tagId} for archive document ${archiveDocumentId}`, 'system', 'database');
             }
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

// Handler for searching by tags (unchanged)
export const archiveDocumentTagSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element, tableAlias
): SearchOnCustomFieldHandlerResult => {
    if (element.field === 'tags' && element.condition === 'ANY_OF' && Array.isArray(element.value)) {
        const tagIds = element.value.filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
        if (tagIds.length === 0) return { whereCondition: element.not ? '1=1' : '1=0', params: [] }; // Match nothing if no valid IDs, unless NOT

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
    // Could add other conditions like 'ALL_OF' or 'NONE_OF' if needed
    return null;
};


// Handler for searching by signature prefix (JSON descriptive signatures only)
export const archiveDocumentSignatureSearchHandler: (element: SearchQueryElement, tableAlias: string) => SearchOnCustomFieldHandlerResult = (
    element, tableAlias
): SearchOnCustomFieldHandlerResult => {
    const signatureFieldMap: Record<string, string> = {
        // --- REMOVED: Topographic prefix searching ---
        // 'topographicSignaturePrefix': 'topographicSignatureElementIds',
        'descriptiveSignaturePrefix': 'descriptiveSignatureElementIds',
    };

    const dbColumn = signatureFieldMap[element.field];
    if (!dbColumn) return null; // Only handle descriptiveSignaturePrefix now

    const value = element.value as unknown; // Value type depends on condition

    if (element.condition === 'ANY_OF' && Array.isArray(value)) {
         // Handle ANY_OF condition for prefix search (value is array of number arrays)
         const validPrefixes = (value as number[][])
             .filter(path => Array.isArray(path) && path.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0));

         if (validPrefixes.length === 0) return { whereCondition: element.not ? '1=1' : '1=0', params: [] };

         const conditions: string[] = [];
         const params: string[] = [];

         validPrefixes.forEach(prefix => {
             const likePatternPrefix = '[' + prefix.join(',') + (prefix.length > 0 ? ',' : '');
             const likePatternExact = '[' + prefix.join(',') + ']';
             conditions.push(`EXISTS (SELECT 1 FROM json_each(${tableAlias}.${dbColumn}) je WHERE (je.value LIKE ? OR je.value = ?))`);
             params.push(likePatternPrefix + '%', likePatternExact);
         });

         let combinedCondition = conditions.join(' OR ');
         if (element.not) combinedCondition = `NOT (${combinedCondition})`;
         return { whereCondition: `(${combinedCondition})`, params: params };

    } else if (element.condition === 'EQ' && Array.isArray(value)) {
        // Handle EQ condition for exact path match (value is single number array)
        const exactPath = value as number[];
        if (!exactPath.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
            return { whereCondition: element.not ? '1=1' : '1=0', params: [] }; // Invalid path format
        }
        const exactPathJsonString = JSON.stringify(exactPath);

        const whereCondition = `
            ${element.not ? 'NOT ' : ''}EXISTS (
                SELECT 1 FROM json_each(${tableAlias}.${dbColumn}) je
                WHERE je.value = ?
            )
        `;
        return { whereCondition: `(${whereCondition})`, params: [exactPathJsonString] };
    }

    return null; // Handler doesn't apply to other conditions for these fields
};