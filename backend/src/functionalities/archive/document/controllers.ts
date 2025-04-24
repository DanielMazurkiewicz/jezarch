
import { BunRequest } from 'bun';
import {
    createArchiveDocument,
    getArchiveDocumentById,
    updateArchiveDocument,
    disableArchiveDocument,
    setTagsForArchiveDocument,
    getTagsForArchiveDocument,
    archiveDocumentTagSearchHandler,
    archiveDocumentSignatureSearchHandler,
    getArchiveDocumentByIdInternal, // For updates/disables
} from './db';
import {
    createArchiveDocumentSchema,
    updateArchiveDocumentSchema,
    CreateArchiveDocumentInput,
    UpdateArchiveDocumentInput,
    ArchiveDocument,
    ArchiveDocumentSearchResult
} from './models';
import { getSessionAndUser, isAllowedRole, isOwner } from '../../session/controllers';
import { Log } from '../../log/db';
import { buildSearchQueries, executeSearch, SearchQueryElement, SearchRequest, SearchResponse } from '../../../utils/search';
import { Tag } from '../../tag/models';

const AREA = 'archive_document';

// --- Create ---
export const createArchiveDocumentController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow regular users to create? Adjust as needed.
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateArchiveDocumentInput = await req.json() as CreateArchiveDocumentInput;
        const validation = createArchiveDocumentSchema.safeParse(body);

        if (!validation.success) {
            await Log.warn('Invalid input for create archive document', sessionAndUser.user.login, AREA, { errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { tagIds, ...docData } = validation.data;
        const ownerUserId = sessionAndUser.user.userId;

        // Prepare data for DB function (add owner, default active=true)
        const inputForDb = {
            ...docData,
            ownerUserId: ownerUserId,
            // 'active' defaults in DB
            // 'createdOn', 'modifiedOn' default in DB
        };

        // Perform creation in DB
        const newDocumentId = await createArchiveDocument(inputForDb as any); // Cast needed due to omitted fields

        // Set tags if provided
        if (tagIds && tagIds.length > 0) {
            await setTagsForArchiveDocument(newDocumentId, tagIds);
        }

        await Log.info(`Archive document created: ${docData.title} (ID: ${newDocumentId})`, sessionAndUser.user.login, AREA);

        // Fetch the created document with tags to return
        const newDocument = await getArchiveDocumentById(newDocumentId);
        if (newDocument) {
            newDocument.tags = await getTagsForArchiveDocument(newDocumentId);
        }

        return new Response(JSON.stringify(newDocument), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create archive document', sessionAndUser.user.login, AREA, error);
        // Handle potential specific errors (e.g., FK violation if parentId is invalid)
        return new Response(JSON.stringify({ message: 'Failed to create archive document', error: error.message }), { status: 500 });
    }
};

// --- Read One ---
export const getArchiveDocumentByIdController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow regular users to read? Check ownership? Public access? - For now, allow logged-in users.
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format in request', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        // === MODIFICATION START: Check for admin access to inactive ===
        let document: ArchiveDocument | undefined;
        const isAdmin = isAllowedRole(sessionAndUser, 'admin');
        // Allow admin to fetch inactive via query param ?includeInactive=true
        const includeInactive = isAdmin && new URL(req.url).searchParams.get('includeInactive') === 'true';

        if (isAdmin && includeInactive) {
            document = await getArchiveDocumentByIdInternal(id); // Admins can fetch inactive
            if (document) {
                await Log.info(`Admin fetched document (active/inactive): ${id}`, sessionAndUser.user.login, AREA);
            }
        } else {
            document = await getArchiveDocumentById(id); // Fetches only active docs by default
        }
        // === MODIFICATION END ===

        if (!document) {
            // Log this occurrence but return standard 404
            await Log.info(`Document not found or inactive (inactive access=${includeInactive})`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found or inactive' }), { status: 404 });
        }

        // Check ownership or admin role if stricter access is needed for non-shared docs (Applies even if admin fetched inactive)
        // if (!isOwner(sessionAndUser, document.ownerUserId) && !isAdmin) {
        //     await Log.warn(`Forbidden access attempt on document ${id}`, sessionAndUser.user.login, AREA);
        //     return new Response("Forbidden", { status: 403 });
        // }

        // Populate tags
        document.tags = await getTagsForArchiveDocument(id);

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

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
            await Log.warn('Invalid document ID format for update', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        const body: UpdateArchiveDocumentInput = await req.json() as UpdateArchiveDocumentInput;
        const validation = updateArchiveDocumentSchema.safeParse(body);
        if (!validation.success) {
            await Log.warn('Invalid input for update archive document', sessionAndUser.user.login, AREA, { documentId: id, errors: validation.error.format() });
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        // Fetch the existing document (internal getter to check even inactive ones)
        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
             await Log.warn(`Attempted to update non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }

        // Authorization: Check ownership or admin role
        if (!isOwner(sessionAndUser, existingDoc.ownerUserId) && !isAllowedRole(sessionAndUser, 'admin')) {
            await Log.error(`Forbidden update attempt on document ${id}`, sessionAndUser.user.login, AREA);
            return new Response("Forbidden", { status: 403 });
        }

        const { tagIds, ...updateData } = validation.data;

        // Perform the update in DB
        const updatedDocData = await updateArchiveDocument(id, updateData);

        // Update tags if 'tagIds' was provided (even if empty array)
        if (tagIds !== undefined) {
            await setTagsForArchiveDocument(id, tagIds);
        }

        await Log.info(`Archive document updated: ${updatedDocData?.title} (ID: ${id})`, sessionAndUser.user.login, AREA);

        // Fetch again with tags to return the final state
        const finalDocument = await getArchiveDocumentByIdInternal(id); // Use internal to show result even if made inactive
        if (finalDocument) {
            finalDocument.tags = await getTagsForArchiveDocument(id);
        }

        return new Response(JSON.stringify(finalDocument), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating archive document', sessionAndUser.user.login, AREA, error);
        // Handle potential specific errors
        return new Response(JSON.stringify({ message: 'Failed to update archive document', error: error.message }), { status: 500 });
    }
};


// --- Disable (Soft Delete) ---
export const disableArchiveDocumentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });

    try {
        const idParam = req.params.id;
        const id = parseInt(idParam);
        if (isNaN(id)) {
             await Log.warn('Invalid document ID format for disable', sessionAndUser.user.login, AREA, { idParam });
            return new Response(JSON.stringify({ message: 'Invalid document ID' }), { status: 400 });
        }

        // Fetch existing doc to check ownership before disabling
        const existingDoc = await getArchiveDocumentByIdInternal(id);
        if (!existingDoc) {
            // Already gone or never existed
             await Log.warn(`Attempted to disable non-existent document`, sessionAndUser.user.login, AREA, { documentId: id });
            return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
        }
         if (!existingDoc.active) {
             // Already inactive
             await Log.warn(`Attempted to disable already inactive document`, sessionAndUser.user.login, AREA, { documentId: id });
             return new Response(JSON.stringify({ message: 'Document already inactive' }), { status: 400 });
         }


        // Authorization: Check ownership or admin role
        if (!isOwner(sessionAndUser, existingDoc.ownerUserId) && !isAllowedRole(sessionAndUser, 'admin')) {
            await Log.error(`Forbidden disable attempt on document ${id}`, sessionAndUser.user.login, AREA);
            return new Response("Forbidden", { status: 403 });
        }

        const disabled = await disableArchiveDocument(id);

        if (disabled) {
            await Log.info(`Archive document disabled: ID ${id}`, sessionAndUser.user.login, AREA);
            return new Response(null, { status: 204 }); // No Content on successful disable
        } else {
             // This might happen in a race condition or if the doc was already inactive
             await Log.warn(`Document disable failed or already inactive for ID ${id}`, sessionAndUser.user.login, AREA);
             // Fetch again to check current status
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
    // Allow any logged-in user to search? Adjust roles if needed.
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;
        const isAdmin = isAllowedRole(sessionAndUser, 'admin');

        // Define allowed fields for direct searching on the 'archive_documents' table
        // IMPORTANT: Add ALL searchable fields from the model here.
        const allowedDirectFields: (keyof ArchiveDocument)[] = [
            'archiveDocumentId', 'parentUnitArchiveDocumentId', 'ownerUserId', 'type',
            'title', 'creator', 'creationDate', 'numberOfPages', 'documentType',
            'dimensions', 'binding', 'condition', 'documentLanguage', 'contentDescription',
            'remarks', 'accessLevel', 'accessConditions', 'additionalInformation',
            'relatedDocumentsReferences', 'isDigitized', 'digitizedVersionLink',
            'createdOn', 'modifiedOn',
            'active' // Include 'active' as an allowed field
        ];
        const primaryKey = 'archiveDocumentId';

        // --- Build Search Queries ---
        // Clone the query array to avoid modifying the original request object directly
        let queryClone = searchRequest.query ? [...searchRequest.query] : [];

        // --- MODIFICATION START: Apply active filter logic ---
        const activeFilterIndex = queryClone.findIndex(el => el.field === 'active');

        if (activeFilterIndex !== -1) {
            // An 'active' filter was explicitly provided
            const activeFilter = queryClone[activeFilterIndex];
             if (!isAdmin) {
                 // Non-admin tried to search by 'active'. Force it to 'active=true' if they tried false.
                 if (activeFilter.condition === 'EQ' && activeFilter.value === false) {
                    queryClone[activeFilterIndex] = { ...activeFilter, value: true }; // Force true
                    await Log.warn(`Non-admin attempted to search for inactive documents. Forcing 'active=true'.`, sessionAndUser.user.login, AREA);
                 } else if (activeFilter.condition !== 'EQ' || activeFilter.value !== true) {
                     // If they used a different condition or value (e.g., GTE, LTE, etc.) or NOT=true, just force EQ true
                     queryClone[activeFilterIndex] = { field: 'active', condition: 'EQ', value: true, not: false };
                     await Log.warn(`Non-admin used disallowed 'active' filter. Forcing 'active=true'.`, sessionAndUser.user.login, AREA);
                 }
                 // If they explicitly searched for active=true, allow it.
             }
             // If admin, allow their explicit filter to pass through unchanged.
        } else {
            // No 'active' filter was provided, add default 'active=true' for ALL users (including admins)
            queryClone.push({ field: 'active', condition: 'EQ', value: true, not: false });
        }
        // --- MODIFICATION END ---

        // Use the modified queryClone
        const searchRequestWithProcessedActiveFilter = { ...searchRequest, query: queryClone };

        const { dataQuery, countQuery } = await buildSearchQueries<ArchiveDocumentSearchResult>(
            'archive_documents',
            searchRequestWithProcessedActiveFilter, // Use the potentially modified request
            allowedDirectFields,
            {
                // --- Custom Field Handlers ---
                'tags': archiveDocumentTagSearchHandler,
                'topographicSignaturePrefix': archiveDocumentSignatureSearchHandler,
                'descriptiveSignaturePrefix': archiveDocumentSignatureSearchHandler,
                // Add more handlers if needed (e.g., date ranges, parent title search)
            },
            primaryKey
        );

        // === Add Debug Logging ===
        await Log.info("Prepared archive document search queries", sessionAndUser.user.login, AREA, {
             dataQuerySql: dataQuery?.sql,
             // dataQueryParams: dataQuery?.params, // Params can be large/sensitive, log selectively if needed
             countQuerySql: countQuery?.sql,
             // countQueryParams: countQuery?.params,
             requestPage: searchRequest.page,
             requestPageSize: searchRequest.pageSize,
             finalQueryUsed: searchRequestWithProcessedActiveFilter.query // Log the final query sent to buildSearchQueries
         });
        // ========================

        // --- Execute Search ---
        const searchResponse = await executeSearch<ArchiveDocumentSearchResult>(dataQuery, countQuery);

        // --- Populate Tags for Results ---
        // Be mindful of N+1 queries here. Fetching all tags at once might be better for many results.
        if (searchResponse.data.length > 0) {
            const docIds = searchResponse.data.map(doc => doc.archiveDocumentId!);
            // In a real high-load scenario, optimize tag fetching (e.g., one query joining docs and tags)
            const tagsMap = new Map<number, Tag[]>();
             for (const docId of docIds) {
                 tagsMap.set(docId, await getTagsForArchiveDocument(docId));
             }
             searchResponse.data.forEach(doc => {
                 doc.tags = tagsMap.get(doc.archiveDocumentId!) || [];
             });
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
