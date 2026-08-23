import { BunRequest } from 'bun';
import {
    createArchiveDocument,
    getArchiveDocumentById,
    updateArchiveDocument,
    softDeleteArchiveDocument,
    restoreArchiveDocument,
    setTagsForArchiveDocument,
    getTagsForArchiveDocument,
    archiveDocumentSignatureSearchHandler,
    getArchiveDocumentByIdInternal,
    getTagsForArchiveDocumentByIds,
    getMatchingDocumentIds,
    addTagsToDocuments,
    removeTagsFromDocuments,
} from './db';
import {
    createArchiveDocumentSchema,
    updateArchiveDocumentSchema,
    CreateArchiveDocumentInput,
    UpdateArchiveDocumentInput,
    ArchiveDocument,
    ArchiveDocumentSearchResult,
    batchTagDocumentsSchema,
    BatchTagDocumentsInput,
} from './models';
// Removed isOwner import
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
import { buildSearchQueries, executeSearch, SearchQuery, SearchQueryElement, SearchRequest, SearchResponse } from '../../../utils/search';
import { parseSearchRequest } from '../../../utils/search_validation';
import { normalizeDocumentSearchRow } from '../../../utils/dbRows';
import { Tag } from '../../tag/models';
import { getAssignedTagIdsForUser } from '../../user/db';
// Removed direct import of archiveDocumentTagSearchHandler, it's passed in buildSearchQueries
import { db } from '../../../initialization/db';
import { populateResolvedDescriptiveSignatures } from '../../signature/element/db';

const AREA = 'archive_document';

// --- Create ---
export const createArchiveDocumentController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateArchiveDocumentInput = await req.json() as CreateArchiveDocumentInput;
        const validation = createArchiveDocumentSchema.safeParse(body);

        if (!validation.success) {
            await Log.warn('Invalid input for create archive document', sessionAndUser.user.login, AREA, { errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { tagIds, ...docData } = validation.data;
        const createdByLogin = sessionAndUser.user.login; // Use login for createdBy

        // Validate the parent unit: it must exist, be visible (not soft-deleted)
        // and actually be a unit — otherwise documents end up filed under
        // hidden or non-hierarchical nodes.
        if (docData.parentUnitArchiveDocumentId !== undefined && docData.parentUnitArchiveDocumentId !== null) {
            const parent = await getArchiveDocumentByIdInternal(docData.parentUnitArchiveDocumentId);
            if (!parent) {
                return new Response(JSON.stringify({ message: 'Parent unit not found' }), { status: 400 });
            }
            if (parent.isDeleted) {
                return new Response(JSON.stringify({ message: 'Parent unit is deleted and cannot be used' }), { status: 400 });
            }
            if (parent.type !== 'unit') {
                return new Response(JSON.stringify({ message: 'Parent must be a unit, not a document' }), { status: 400 });
            }
        }

        // Strip physical description fields if type is 'document'
        // (documentLanguage is kept: it applies to documents too)
        if (docData.type === 'document') {
            delete (docData as any).numberOfPages;
            delete (docData as any).documentType;
            delete (docData as any).dimensions;
            delete (docData as any).binding;
            delete (docData as any).condition;
        }

        const inputForDb = {
            ...docData,
            condition: docData.condition ?? null,
            topographicSignature: docData.topographicSignature ?? null,
            createdBy: createdByLogin, // Add createdBy field
        } as Parameters<typeof createArchiveDocument>[0];

        // Document insert + tag assignment form one atomic unit
        const runCreate = db.transaction(async (): Promise<number> => {
            const id = await createArchiveDocument(inputForDb);
            if (tagIds && tagIds.length > 0) {
                await setTagsForArchiveDocument(id, tagIds);
            }
            return id;
        });
        const newDocumentId = await runCreate();

        await Log.info(`Archive document created: ${docData.title} (ID: ${newDocumentId}) by ${createdByLogin}`, sessionAndUser.user.login, AREA);

        // Fetch the newly created document to return it with all fields (including updatedBy)
        const newDocument = await getArchiveDocumentByIdInternal(newDocumentId);
        if (newDocument) {
            newDocument.tags = await getTagsForArchiveDocument(newDocumentId);
            if (newDocument.descriptiveSignatureElementIds && newDocument.descriptiveSignatureElementIds.length > 0) {
                await populateResolvedDescriptiveSignatures([newDocument as ArchiveDocumentSearchResult]);
            } else {
                (newDocument as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
            }
        }

        return new Response(JSON.stringify(newDocument), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to create archive document' }), { status: 500 });
    }
};

// --- Read One ---
export const getArchiveDocumentByIdController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // User role access depends on tags, not ownership
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee', 'user')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format in request', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        let document: ArchiveDocument | undefined;

        document = await getArchiveDocumentById(id);

        if (!document) {
            await Log.info(`Document not found (user: ${sessionAndUser.user.login})`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }

        // Soft-deleted documents stay hidden from the restricted 'user' role;
        // admin/employee may inspect them (e.g. to decide about restoring).
        if (document.isDeleted && !isAllowedRole(sessionAndUser, 'admin', 'employee')) {
            await Log.info(`Deleted document was requested by 'user' role, treating as not found (user: ${sessionAndUser.user.login})`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }

        document.tags = await getTagsForArchiveDocument(id);

        // Access control for 'user' role based on tags
        if (sessionAndUser.user.role === 'user') {
            const userAllowedTagIds = await getAssignedTagIdsForUser(sessionAndUser.user.userId);
            const hasAllowedTag = document.tags.some(tag => userAllowedTagIds.includes(tag.tagId!));
            if (!hasAllowedTag) {
                 await Log.warn(`Forbidden access attempt by 'user' on document ${id} due to tag permissions`, sessionAndUser.user.login, AREA);
                 return new Response("Forbidden: You do not have permission to view this document based on assigned tags.", { status: 403 });
            }
             await Log.info(`'user' ${sessionAndUser.user.login} accessed document ${id} with allowed tag`, sessionAndUser.user.login, AREA);
        }

        // Populate resolved signatures (remains the same)
        if (document.descriptiveSignatureElementIds && document.descriptiveSignatureElementIds.length > 0) {
            await populateResolvedDescriptiveSignatures([document as ArchiveDocumentSearchResult]);
        } else {
            (document as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
        }

        return new Response(JSON.stringify(document), { status: 200 });

    } catch (error: any) {
        await Log.error('Error fetching archive document by ID', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get archive document' }), { status: 500 });
    }
};

// --- Update ---
export const updateArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins and employees can update
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format for update', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        const rawBody = await req.json() as Record<string, any>;
        const validation = updateArchiveDocumentSchema.safeParse(rawBody);

        if (!validation.success) {
            await Log.warn('Invalid input for update archive document', sessionAndUser.user.login, AREA, { documentId: id, errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
             await Log.warn(`Attempted to update non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }

        // Removed ownership change logic

        const { tagIds, ...updateData } = validation.data;
        const updatedByLogin = sessionAndUser.user.login; // Use login for updatedBy

        // Validate the parent unit when it is being changed
        if (updateData.parentUnitArchiveDocumentId !== undefined) {
            if (updateData.parentUnitArchiveDocumentId === id) {
                return new Response(JSON.stringify({ message: 'Document cannot be its own parent' }), { status: 400 });
            }
            if (updateData.parentUnitArchiveDocumentId !== null) {
                const parent = await getArchiveDocumentByIdInternal(updateData.parentUnitArchiveDocumentId);
                if (!parent) {
                    return new Response(JSON.stringify({ message: 'Parent unit not found' }), { status: 400 });
                }
                if (parent.isDeleted) {
                    return new Response(JSON.stringify({ message: 'Parent unit is deleted and cannot be used' }), { status: 400 });
                }
                if (parent.type !== 'unit') {
                    return new Response(JSON.stringify({ message: 'Parent must be a unit, not a document' }), { status: 400 });
                }
            }
        }

        // Strip physical description fields if type is 'document'
        // (documentLanguage is kept: it applies to documents too)
        if (updateData.type === 'document') {
            delete (updateData as any).numberOfPages;
            delete (updateData as any).documentType;
            delete (updateData as any).dimensions;
            delete (updateData as any).binding;
            delete (updateData as any).condition;
        }

        // Core update + tag replacement form one atomic unit; use the zod-validated tagIds.
        const runUpdate = db.transaction(async () => {
            const updated = await updateArchiveDocument(id, updateData, updatedByLogin);
            if (tagIds !== undefined) {
                await setTagsForArchiveDocument(id, tagIds);
            }
            return updated;
        });
        const updatedDocData = await runUpdate();

        await Log.info(`Archive document updated: ${updatedDocData?.title} (ID: ${id}) by ${updatedByLogin}`, sessionAndUser.user.login, AREA);

        const finalDocument = await getArchiveDocumentByIdInternal(id);
        if (finalDocument) {
            finalDocument.tags = await getTagsForArchiveDocument(id);
            if (finalDocument.descriptiveSignatureElementIds && finalDocument.descriptiveSignatureElementIds.length > 0) {
                await populateResolvedDescriptiveSignatures([finalDocument as ArchiveDocumentSearchResult]);
            } else {
                (finalDocument as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
            }
        }

        return new Response(JSON.stringify(finalDocument), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to update archive document' }), { status: 500 });
    }
};

// --- Soft Delete ---
// Logic remains largely the same, but permissions are simplified
export const softDeleteArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins and employees can delete
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
             await Log.warn(`Invalid document ID format for delete`, sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
             await Log.warn(`Attempted to delete non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }
         if (existingDoc.isDeleted) {
             await Log.warn(`Attempted to delete already deleted document`, sessionAndUser.user.login, AREA, { documentId: id });
             return new Response(JSON.stringify({ message: 'Document already deleted' }), { status: 400 });
         }

        const deleted = await softDeleteArchiveDocument(id);

        if (deleted) {
            // Log the user who performed the delete action
            await Log.info(`Archive document deleted: ID ${id} by ${sessionAndUser.user.login}`, sessionAndUser.user.login, AREA);
            return new Response(null, { status: 204 });
        } else {
             // This case is less likely now with the checks above, but keep for robustness
             await Log.warn(`Document delete failed or already deleted for ID ${id}`, sessionAndUser.user.login, AREA);
             const currentDoc = await getArchiveDocumentByIdInternal(id);
             if (currentDoc && currentDoc.isDeleted) {
                return new Response(JSON.stringify({ message: 'Document already deleted' }), { status: 400 });
             } else {
                 return new Response(JSON.stringify({ message: 'Document not found or delete failed' }), { status: 404 });
             }
        }
    } catch (error: any) {
        await Log.error('Failed to soft delete archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to delete archive document' }), { status: 500 });
    }
};

// --- Restore ---
export const restoreArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format for restore', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
            await Log.warn(`Attempted to restore non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }
        if (!existingDoc.isDeleted) {
            await Log.warn(`Attempted to restore already restored document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document already restored' }), { status: 400 });
        }

        const restored = await restoreArchiveDocument(id);

        if (restored) {
            await Log.info(`Archive document restored: ID ${id} by ${sessionAndUser.user.login}`, sessionAndUser.user.login, AREA);
            return new Response(null, { status: 204 });
        } else {
            await Log.warn(`Document restore failed for ID ${id}`, sessionAndUser.user.login, AREA);
            const currentDoc = await getArchiveDocumentByIdInternal(id);
            if (currentDoc && !currentDoc.isDeleted) {
                return new Response(JSON.stringify({ message: 'Document already restored' }), { status: 400 });
            } else {
                return new Response(JSON.stringify({ message: 'Document not found or restore failed' }), { status: 404 });
            }
        }
    } catch (error: any) {
        await Log.error('Failed to restore archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to restore archive document' }), { status: 500 });
    }
};

// --- Search ---
// Updated allowedDirectFields, removed ownerUserId logic
export const searchArchiveDocumentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // User role access depends on tags
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee', 'user')) return new Response("Forbidden", { status: 403 });

    try {
        const rawBody: unknown = await req.json();
        const searchRequest = parseSearchRequest(rawBody);
        if (!searchRequest) {
            return new Response(JSON.stringify({ message: 'Invalid search request' }), { status: 400 });
        }
        const isAdmin = isAllowedRole(sessionAndUser, 'admin');
        const isEmployee = isAllowedRole(sessionAndUser, 'employee');
        const isUserRole = sessionAndUser.user.role === 'user';

        // Updated allowed fields
        const allowedDirectFields: (keyof ArchiveDocument)[] = [
            'archiveDocumentId', 'parentUnitArchiveDocumentId', 'createdBy', 'updatedBy', 'type', // Changed fields
            'title', 'creator', 'creationDate', 'numberOfPages', 'documentType',
            'dimensions', 'binding', 'condition', 'documentLanguage', 'contentDescription',
            'remarks', 'accessLevel', 'accessConditions', 'additionalInformation',
            'relatedDocumentsReferences', 'isDigitized', 'digitizedVersionLink',
            'createdOn', 'modifiedOn', 'isDeleted',
            'topographicSignature'
        ];
        const primaryKey = 'archiveDocumentId';

        let queryClone = searchRequest.query ? [...searchRequest.query] : [];

        // 'isDeleted' filter logic: 'user' role is always restricted to non-deleted
        // documents; admin/employee see deleted documents unless they filter them out.
        const isDeletedFilterIndex = queryClone.findIndex(el => el.field === 'isDeleted');
        if (isDeletedFilterIndex !== -1) {
             const isDeletedFilter = queryClone[isDeletedFilterIndex];
             if (!isAdmin && !isEmployee && isDeletedFilter && (isDeletedFilter.condition !== 'EQ' || isDeletedFilter.value !== false)) {
                 queryClone[isDeletedFilterIndex] = { field: 'isDeleted', condition: 'EQ', value: false, not: false };
                 await Log.warn(`'user' role search forced to 'isDeleted=false'.`, sessionAndUser.user.login, AREA);
             }
        } else if (!isAdmin && !isEmployee) {
            queryClone.push({ field: 'isDeleted', condition: 'EQ', value: false, not: false });
            await Log.info(`Defaulting 'isDeleted=false' for 'user' role search.`, sessionAndUser.user.login, AREA);
        }

        // Tag filtering logic for 'user' role remains the same
        let allowedTagIds: number[] | null = null;
        if (isUserRole) {
            allowedTagIds = await getAssignedTagIdsForUser(sessionAndUser.user.userId);
            if (allowedTagIds.length === 0) {
                await Log.info(`'user' ${sessionAndUser.user.login} has no assigned tags, returning empty search results.`, sessionAndUser.user.login, AREA);
                const emptyResponse: SearchResponse<ArchiveDocumentSearchResult> = { data: [], page: 1, pageSize: searchRequest.pageSize, totalPages: 0, totalSize: 0 };
                return new Response(JSON.stringify(emptyResponse), { status: 200 });
            }
             const existingTagFilterIndex = queryClone.findIndex(q => q.field === 'tags');
             if (existingTagFilterIndex !== -1) {
                 queryClone.splice(existingTagFilterIndex, 1);
             }
             queryClone.push({ field: 'tags', condition: 'ANY_OF', value: allowedTagIds, not: false });
             await Log.info(`Applying mandatory allowed tag filter for 'user' role.`, sessionAndUser.user.login, AREA, { allowed: allowedTagIds });
        }

        const finalSearchRequest = { ...searchRequest, query: queryClone };

        const useReversedTypeOrder = finalSearchRequest.sortBy === 'type' && finalSearchRequest.sortOrder === 'ASC';
        const primaryOrderBy = useReversedTypeOrder
            ? `CASE WHEN archive_documents_main.type = 'document' AND archive_documents_main.parentUnitArchiveDocumentId IS NULL THEN 0 WHEN archive_documents_main.type = 'document' AND archive_documents_main.parentUnitArchiveDocumentId IS NOT NULL THEN 1 WHEN archive_documents_main.type = 'unit' THEN 2 ELSE 2 END`
            : `CASE WHEN archive_documents_main.type = 'unit' THEN 0 WHEN archive_documents_main.type = 'document' AND archive_documents_main.parentUnitArchiveDocumentId IS NULL THEN 1 ELSE 2 END`;

        // Build queries using updated allowedFields
        const { dataQuery, countQuery } = await buildSearchQueries<ArchiveDocumentSearchResult>(
            'archive_documents',
            finalSearchRequest,
            allowedDirectFields,
            {
                // Tag handler remains the same
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
                // Signature handler remains the same
                'descriptiveSignature': archiveDocumentSignatureSearchHandler,
                // No special handler needed for createdBy/updatedBy (handled by default text search)
            },
            primaryKey,
            primaryOrderBy
        );

        await Log.info("Prepared archive document search queries", sessionAndUser.user.login, AREA, {
             countQuerySql: countQuery?.sql,
             requestPage: searchRequest.page,
             requestPageSize: searchRequest.pageSize,
             finalQueryUsed: finalSearchRequest.query
         });

        const searchResponse = await executeSearch<ArchiveDocumentSearchResult>(dataQuery, countQuery);

        // Normalize raw SQLite rows (0/1 flags, JSON columns) to model shapes
        searchResponse.data.forEach(normalizeDocumentSearchRow);

        // Populate tags and resolved signatures (remains the same)
        if (searchResponse.data.length > 0) {
            const docIds = searchResponse.data.map(doc => doc.archiveDocumentId!);
            const tagsMap = await getTagsForArchiveDocumentByIds(docIds);
            searchResponse.data.forEach(doc => {
                doc.tags = tagsMap.get(doc.archiveDocumentId!) || [];
            });
            await populateResolvedDescriptiveSignatures(searchResponse.data);
        }

        return new Response(JSON.stringify(searchResponse), { status: 200 });

    } catch (error: any) {
        await Log.error('Archive document search failed', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to search archive documents',
        }), { status: 500 });
    }
};

// --- Batch Tagging Controller ---
// Logic remains mostly the same, underlying search will use updated fields
export const batchTagArchiveDocumentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as BatchTagDocumentsInput;
        const validation = batchTagDocumentsSchema.safeParse(body);

        if (!validation.success) {
            await Log.warn('Invalid input for batch tagging', sessionAndUser.user.login, AREA, { errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { searchQuery, tagIds, action } = validation.data;
        const finalQuery: SearchQuery = [...searchQuery] as SearchQuery;

        // Get IDs using the potentially updated search fields
        const matchingIds = await getMatchingDocumentIds({ query: finalQuery, page: 1, pageSize: -1 });

        if (matchingIds.length === 0) {
            await Log.info('No documents found matching batch tag criteria.', sessionAndUser.user.login, AREA, { finalQuery });
            return new Response(JSON.stringify({ message: "No documents match the specified criteria.", count: 0 }), { status: 200 });
        }

        let changedCount = 0;
        if (action === 'add') {
            changedCount = await addTagsToDocuments(matchingIds, tagIds);
            await Log.info(`Batch ADDED tags [${tagIds.join(',')}] to ${changedCount} documents matching query.`, sessionAndUser.user.login, AREA, { query: finalQuery });
        } else if (action === 'remove') {
            changedCount = await removeTagsFromDocuments(matchingIds, tagIds);
            await Log.info(`Batch REMOVED tags [${tagIds.join(',')}] from ${changedCount} documents matching query.`, sessionAndUser.user.login, AREA, { query: finalQuery });
        }

        return new Response(JSON.stringify({
            message: `Successfully ${action === 'add' ? 'added' : 'removed'} tags for ${changedCount} documents.`,
            count: changedCount
        }), { status: 200 });

    } catch (error: any) {
        await Log.error('Batch tagging operation failed', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to perform batch tag operation',
        }), { status: 500 });
    }
};