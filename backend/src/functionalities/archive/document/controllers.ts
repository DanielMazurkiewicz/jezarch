import { BunRequest } from 'bun';
import {
    createArchiveDocument,
    getArchiveDocumentById,
    updateArchiveDocument,
    disableArchiveDocument,
    setTagsForArchiveDocument,
    getTagsForArchiveDocument,
    archiveDocumentSignatureSearchHandler,
    getArchiveDocumentByIdInternal,
    getTagsForArchiveDocumentByIds,
    // --- NEW: Import batch tagging DB functions ---
    getMatchingDocumentIds,
    addTagsToDocuments,
    removeTagsFromDocuments,
    // --- END NEW ---
} from './db';
import {
    createArchiveDocumentSchema,
    updateArchiveDocumentSchema,
    CreateArchiveDocumentInput,
    UpdateArchiveDocumentInput,
    ArchiveDocument,
    ArchiveDocumentSearchResult,
    // --- NEW: Import batch tagging schema ---
    batchTagDocumentsSchema,
    BatchTagDocumentsInput,
    // --- END NEW ---
} from './models'; // Types updated here
import { getSessionAndUser, isAllowedRole, isOwner } from '../../session/controllers';
import { Log } from '../../log/db';
import { buildSearchQueries, executeSearch, SearchQueryElement, SearchRequest, SearchResponse } from '../../../utils/search';
import { Tag } from '../../tag/models';
// Added imports for user tag checks
import { getAssignedTagIdsForUser } from '../../user/db';
import { archiveDocumentTagSearchHandler } from './db'; // Re-import the handler directly
import { db } from '../../../initialization/db'; // Import db for transaction count
// --- NEW: Import signature path resolver ---
import { populateResolvedDescriptiveSignatures } from '../../signature/element/db'; // Adjust path if necessary
// --- END NEW ---

const AREA = 'archive_document';

// --- Create ---
export const createArchiveDocumentController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow employees and admins to create
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateArchiveDocumentInput = await req.json() as CreateArchiveDocumentInput;
        const validation = createArchiveDocumentSchema.safeParse(body); // Schema now uses topographicSignature string

        if (!validation.success) {
            await Log.warn('Invalid input for create archive document', sessionAndUser.user.login, AREA, { errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        // Destructure validated data (includes topographicSignature)
        const { tagIds, ...docData } = validation.data;
        const ownerUserId = sessionAndUser.user.userId;

        // Prepare data for DB, ensuring topographicSignature is passed
        const inputForDb = {
            ...docData, // Includes topographicSignature (string | null | undefined)
            ownerUserId: ownerUserId,
            // descriptiveSignatureElementIds is already handled by docData if present
        };

        // Call create function (DB function now expects topographicSignature)
        const newDocumentId = await createArchiveDocument(inputForDb as any); // Cast needed due to Omit in DB function? Check DB function signature.

        if (tagIds && tagIds.length > 0) {
            await setTagsForArchiveDocument(newDocumentId, tagIds);
        }

        await Log.info(`Archive document created: ${docData.title} (ID: ${newDocumentId})`, sessionAndUser.user.login, AREA);

        const newDocument = await getArchiveDocumentByIdInternal(newDocumentId);
        if (newDocument) {
            newDocument.tags = await getTagsForArchiveDocument(newDocumentId);
            // Resolve signatures for the newly created document before sending
            if (newDocument.descriptiveSignatureElementIds && newDocument.descriptiveSignatureElementIds.length > 0) {
                 // Temporarily cast to ArchiveDocumentSearchResult to use populateResolvedDescriptiveSignatures
                await populateResolvedDescriptiveSignatures([newDocument as ArchiveDocumentSearchResult]);
            } else {
                (newDocument as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
            }
        }


        return new Response(JSON.stringify(newDocument), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to create archive document', error: error.message }), { status: 500 });
    }
};

// --- Read One --- (No changes needed, DB function handles structure)
export const getArchiveDocumentByIdController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow employees and admins full read access.
    // Allow 'user' role limited read access (only active, check tag permission later).
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee', 'user')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format in request', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        let document: ArchiveDocument | undefined;
        const isAdminOrEmployee = isAllowedRole(sessionAndUser, 'admin', 'employee');
        const includeInactive = isAdminOrEmployee && new URL(req.url).searchParams.get('includeInactive') === 'true';

        if (isAdminOrEmployee && includeInactive) {
            document = await getArchiveDocumentByIdInternal(id); // Admins/Employees can fetch inactive
            if (document) {
                await Log.info(`Admin/Employee fetched document (active/inactive): ${id}`, sessionAndUser.user.login, AREA);
            }
        } else {
            // Standard user or admin/employee fetching active only
            document = await getArchiveDocumentById(id); // Fetches only active docs by default
        }

        if (!document) {
            await Log.info(`Document not found or inactive (user: ${sessionAndUser.user.login}, inactive access=${includeInactive})`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found or inactive' }), { status: 404 });
        }

        // Populate tags for all roles before the 'user' role check
        document.tags = await getTagsForArchiveDocument(id);

        // --- 'user' Role Tag Check ---
        if (sessionAndUser.user.role === 'user') {
            const userAllowedTagIds = await getAssignedTagIdsForUser(sessionAndUser.user.userId);
            // document.tags already populated
            const hasAllowedTag = document.tags.some(tag => userAllowedTagIds.includes(tag.tagId!));
            if (!hasAllowedTag) {
                 await Log.warn(`Forbidden access attempt by 'user' on document ${id} due to tag permissions`, sessionAndUser.user.login, AREA);
                 return new Response("Forbidden: You do not have permission to view this document based on assigned tags.", { status: 403 });
            }
             await Log.info(`'user' ${sessionAndUser.user.login} accessed document ${id} with allowed tag`, sessionAndUser.user.login, AREA);
        }
        // --- End Tag Check ---

        // Resolve descriptive signatures for the single document
        if (document.descriptiveSignatureElementIds && document.descriptiveSignatureElementIds.length > 0) {
             // Temporarily cast to ArchiveDocumentSearchResult to use populateResolvedDescriptiveSignatures
            await populateResolvedDescriptiveSignatures([document as ArchiveDocumentSearchResult]);
        } else {
            (document as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
        }


        return new Response(JSON.stringify(document), { status: 200 });

    } catch (error: any) {
        await Log.error('Error fetching archive document by ID', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get archive document', error: error.message }), { status: 500 });
    }
};

// --- Update ---
export const updateArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow employees and admins to update
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format for update', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        // Keep the raw body for owner check and tagIds
        const rawBody = await req.json() as Record<string, any>;
        // Validate against the schema that DOES NOT include ownerUserId but DOES include topographicSignature
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

        // validation.data contains only the valid fields *excluding* ownerUserId but including optional fields like topographicSignature
        const { tagIds, ...updateData } = validation.data;

        // Explicitly define the type for the data being sent to the DB update function
        // This type *includes* the optional ownerUserId
        // topographicSignature and descriptiveSignatureElementIds are already part of updateData if validated
        let finalUpdateData: UpdateArchiveDocumentInput = { ...updateData };

        // Check if ownerUserId is present in the RAW input body AND is different from existing
        const requestedOwnerId = rawBody.ownerUserId;
        if (requestedOwnerId !== undefined && typeof requestedOwnerId === 'number' && existingDoc.ownerUserId !== requestedOwnerId) {
            // Attempting to change owner
            if (!isAllowedRole(sessionAndUser, 'admin')) {
                await Log.error(`Forbidden attempt to change owner by non-admin on document ${id}`, sessionAndUser.user.login, AREA);
                return new Response("Forbidden: Only admins can change ownership.", { status: 403 });
            }
            // If admin, add ownerUserId to the final update payload
            finalUpdateData.ownerUserId = requestedOwnerId;
        }

        // Pass the correctly typed finalUpdateData to the DB function
        // DB function now handles topographicSignature string
        const updatedDocData = await updateArchiveDocument(id, finalUpdateData);

        // Handle tags separately using the validated tagIds from the raw body
        const validatedTagIds = rawBody.tagIds;
        if (validatedTagIds !== undefined && Array.isArray(validatedTagIds)) {
            await setTagsForArchiveDocument(id, validatedTagIds.filter((tid): tid is number => typeof tid === 'number'));
        }


        await Log.info(`Archive document updated: ${updatedDocData?.title} (ID: ${id})`, sessionAndUser.user.login, AREA);

        const finalDocument = await getArchiveDocumentByIdInternal(id);
        if (finalDocument) {
            finalDocument.tags = await getTagsForArchiveDocument(id);
            // Resolve signatures for the updated document before sending
            if (finalDocument.descriptiveSignatureElementIds && finalDocument.descriptiveSignatureElementIds.length > 0) {
                 // Temporarily cast to ArchiveDocumentSearchResult to use populateResolvedDescriptiveSignatures
                await populateResolvedDescriptiveSignatures([finalDocument as ArchiveDocumentSearchResult]);
            } else {
                (finalDocument as ArchiveDocumentSearchResult).resolvedDescriptiveSignatures = [];
            }
        }


        return new Response(JSON.stringify(finalDocument), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to update archive document', error: error.message }), { status: 500 });
    }
};


// --- Disable (Soft Delete) --- (No changes needed)
export const disableArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow employees and admins to disable
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
             await Log.warn('Invalid document ID format for disable', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
             await Log.warn(`Attempted to disable non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }
         if (!existingDoc.active) {
             await Log.warn(`Attempted to disable already inactive document`, sessionAndUser.user.login, AREA, { documentId: id });
             return new Response(JSON.stringify({ message: 'Document already inactive' }), { status: 400 });
         }

        const disabled = await disableArchiveDocument(id);

        if (disabled) {
            await Log.info(`Archive document disabled: ID ${id}`, sessionAndUser.user.login, AREA);
            return new Response(null, { status: 204 }); // No Content
        } else {
             await Log.warn(`Document disable failed or already inactive for ID ${id}`, sessionAndUser.user.login, AREA);
             const currentDoc = await getArchiveDocumentByIdInternal(id);
             if (currentDoc && !currentDoc.active) {
                return new Response(JSON.stringify({ message: 'Document already inactive' }), { status: 400 });
             } else {
                 return new Response(JSON.stringify({ message: 'Document not found or disable failed' }), { status: 404 });
             }
        }
    } catch (error: any) {
        await Log.error('Failed to disable archive document', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to disable archive document', error: error.message }), { status: 500 });
    }
};

// --- Search ---
export const searchArchiveDocumentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow all logged-in roles to search, but apply filters based on role
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee', 'user')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;
        const isAdmin = isAllowedRole(sessionAndUser, 'admin');
        const isEmployee = isAllowedRole(sessionAndUser, 'employee');
        const isUserRole = sessionAndUser.user.role === 'user'; // Specific check for 'user'

        // --- UPDATED: Include topographicSignature, remove topographicSignatureElementIds ---
        const allowedDirectFields: (keyof ArchiveDocument)[] = [
            'archiveDocumentId', 'parentUnitArchiveDocumentId', 'ownerUserId', 'type',
            'title', 'creator', 'creationDate', 'numberOfPages', 'documentType',
            'dimensions', 'binding', 'condition', 'documentLanguage', 'contentDescription',
            'remarks', 'accessLevel', 'accessConditions', 'additionalInformation',
            'relatedDocumentsReferences', 'isDigitized', 'digitizedVersionLink',
            'createdOn', 'modifiedOn', 'active',
            'topographicSignature' // Added string field
        ];
        const primaryKey = 'archiveDocumentId';

        let queryClone = searchRequest.query ? [...searchRequest.query] : [];

        // --- Active Filter Logic (unchanged) ---
        const activeFilterIndex = queryClone.findIndex(el => el.field === 'active');
        if (activeFilterIndex !== -1) {
            const activeFilter = queryClone[activeFilterIndex];
             // Non-admin/employee (i.e., 'user' role) tried to search by 'active'. Force it to 'active=true'.
             if (!isAdmin && !isEmployee && activeFilter) {
                 if ((activeFilter.condition === 'EQ' && activeFilter.value === false) || (activeFilter.condition !== 'EQ' || activeFilter.value !== true)) {
                     queryClone[activeFilterIndex] = { field: 'active', condition: 'EQ', value: true, not: false };
                     await Log.warn(`'user' role search forced to 'active=true'.`, sessionAndUser.user.login, AREA);
                 }
             }
        } else {
            if (!isAdmin && !isEmployee) {
                 queryClone.push({ field: 'active', condition: 'EQ', value: true, not: false });
                 await Log.info(`Defaulting 'active=true' for 'user' role search.`, sessionAndUser.user.login, AREA);
            }
        }
        // --- End Active Filter ---

        // --- Owner Filtering Logic (unchanged) ---

        // --- 'user' Role Tag Filtering (unchanged) ---
        let allowedTagIds: number[] | null = null;
        if (isUserRole) {
            allowedTagIds = await getAssignedTagIdsForUser(sessionAndUser.user.userId);
            if (allowedTagIds.length === 0) {
                await Log.info(`'user' ${sessionAndUser.user.login} has no assigned tags, returning empty search results.`, sessionAndUser.user.login, AREA);
                const emptyResponse: SearchResponse<ArchiveDocumentSearchResult> = { data: [], page: 1, pageSize: searchRequest.pageSize, totalPages: 0, totalSize: 0 };
                return new Response(JSON.stringify(emptyResponse), { status: 200 });
            }
             // Ensure tags are always filtered for the 'user' role
             const existingTagFilterIndex = queryClone.findIndex(q => q.field === 'tags');
             if (existingTagFilterIndex !== -1) {
                 queryClone.splice(existingTagFilterIndex, 1); // Remove existing tag filter if present
             }
             queryClone.push({ field: 'tags', condition: 'ANY_OF', value: allowedTagIds, not: false });
             await Log.info(`Applying mandatory allowed tag filter for 'user' role.`, sessionAndUser.user.login, AREA, { allowed: allowedTagIds });
        }
        // --- End 'user' Role Tag Filtering ---

        const finalSearchRequest = { ...searchRequest, query: queryClone };

        const { dataQuery, countQuery } = await buildSearchQueries<ArchiveDocumentSearchResult>(
            'archive_documents',
            finalSearchRequest,
            allowedDirectFields,
            {
                'tags': archiveDocumentTagSearchHandler,
                'descriptiveSignaturePrefix': archiveDocumentSignatureSearchHandler,
            },
            primaryKey
        );

        await Log.info("Prepared archive document search queries", sessionAndUser.user.login, AREA, {
             countQuerySql: countQuery?.sql,
             requestPage: searchRequest.page,
             requestPageSize: searchRequest.pageSize,
             finalQueryUsed: finalSearchRequest.query
         });

        const searchResponse = await executeSearch<ArchiveDocumentSearchResult>(dataQuery, countQuery);

        if (searchResponse.data.length > 0) {
            const docIds = searchResponse.data.map(doc => doc.archiveDocumentId!);
            const tagsMap = await getTagsForArchiveDocumentByIds(docIds);
            searchResponse.data.forEach(doc => {
                doc.tags = tagsMap.get(doc.archiveDocumentId!) || [];
            });
            // --- NEW: Populate resolved descriptive signatures ---
            await populateResolvedDescriptiveSignatures(searchResponse.data);
            // --- END NEW ---
        }

        return new Response(JSON.stringify(searchResponse), { status: 200 });

    } catch (error: any) {
        await Log.error('Archive document search failed', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to search archive documents',
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};

// --- NEW: Batch Tagging Controller ---
export const batchTagArchiveDocumentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow employees and admins to batch tag
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as BatchTagDocumentsInput;
        const validation = batchTagDocumentsSchema.safeParse(body);

        if (!validation.success) {
            await Log.warn('Invalid input for batch tagging', sessionAndUser.user.login, AREA, { errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { searchQuery, tagIds, action } = validation.data;

        // Apply role-based filters to the provided searchQuery to ensure users don't tag documents they can't see
        let finalQuery = [...searchQuery];
        const isAdmin = isAllowedRole(sessionAndUser, 'admin');
        const isEmployee = isAllowedRole(sessionAndUser, 'employee');
        const isUserRole = sessionAndUser.user.role === 'user'; // Should not happen due to role check above, but for safety

        // Force active=true if user is not admin/employee (this shouldn't be reachable due to the role check, but keeps logic consistent)
        const activeFilterIndex = finalQuery.findIndex(el => el.field === 'active');
        if (!isAdmin && !isEmployee) {
             if (activeFilterIndex !== -1) {
                 finalQuery[activeFilterIndex] = { field: 'active', condition: 'EQ', value: true, not: false };
             } else {
                 finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false });
             }
             await Log.info(`Batch tag forced to 'active=true' for non-admin/employee (should not happen).`, sessionAndUser.user.login, AREA);
        }

        // Force tag filtering if user is 'user' role (also shouldn't happen)
        if (isUserRole) {
             const allowedTagIds = await getAssignedTagIdsForUser(sessionAndUser.user.userId);
             if (allowedTagIds.length === 0) {
                 return new Response(JSON.stringify({ message: "No documents match criteria (user has no assigned tags)." }), { status: 200 });
             }
             const existingTagFilterIndex = finalQuery.findIndex(q => q.field === 'tags');
             if (existingTagFilterIndex !== -1) {
                 finalQuery.splice(existingTagFilterIndex, 1);
             }
             finalQuery.push({ field: 'tags', condition: 'ANY_OF', value: allowedTagIds, not: false });
             await Log.info(`Batch tag applying mandatory tag filter for 'user' role (should not happen).`, sessionAndUser.user.login, AREA);
        }


        // Get the IDs of all documents matching the (potentially role-restricted) filters
        const matchingIds = await getMatchingDocumentIds({ query: finalQuery, page: 1, pageSize: -1 }); // pageSize -1 indicates no limit

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
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};