// backend/src/functionalities/signature/element/controllers.ts
import { BunRequest } from 'bun';
import { db } from '../../../initialization/db'; // Import db for transaction
import {
    createElement,
    getElementById,
    updateElement,
    deleteElement,
    getElementsByComponentId,
    setParentElementIds,
    elementParentSearchHandler, // Import the handler
    getParentElements,
    // updateElementIndex // Not directly used here, part of re-index
} from './db';
import { getComponentById, incrementComponentIndexCount } from '../component/db'; // Need component DB access + incrementer
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
import { formatIndex } from '../../../utils/formatIndex'; // Import the formatter
import {
    createSignatureElementSchema,
    updateSignatureElementSchema,
    CreateSignatureElementInput,
    UpdateSignatureElementInput,
    SignatureElement,
    SignatureElementSearchResult
} from './models';
import { SearchOnCustomFieldHandlerResult, SearchRequest, buildSearchQueries, executeSearch } from '../../../utils/search'; // Import search utilities


const ELEMENT_AREA = 'signature_element';

// --- Create ---
export const createElementController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    let componentId: number | null = null; // Keep track for logging/rollback info
    let createdElementId: number | null = null;

    // Use transaction to ensure count increment and element creation are atomic
    const transaction = db.transaction(async (validatedData: CreateSignatureElementInput) => {
        const { signatureComponentId, name, description, index: providedIndex, parentIds } = validatedData;
        componentId = signatureComponentId; // Store for outer scope

        // 1. Verify component exists (essential before incrementing)
        const component = await getComponentById(signatureComponentId);
        if (!component) {
            // Throw error to abort transaction
            throw new Error(`Component with ID ${signatureComponentId} not found`);
        }

        let indexToUse: string | null = providedIndex ?? null; // Use provided index if it exists (even if empty string)

        // 2. Increment component's counter regardless of whether index is provided
        // This keeps the counter accurate for the *next* auto-generation.
        const newCount = await incrementComponentIndexCount(signatureComponentId);

        // 3. Generate index automatically *only* if not provided by the user
        if (providedIndex === undefined || providedIndex === null) {
             // Generate index based on the *new* count and component type
             indexToUse = formatIndex(newCount, component.index_type);
        }

        // 4. Create the element record
        const newElement = await createElement(signatureComponentId, name, description, indexToUse);
        createdElementId = newElement.signatureElementId!; // Store for potential parent setting

        // 5. Set parent relationships if provided (still inside transaction)
        if (createdElementId && parentIds && parentIds.length > 0) {
            await setParentElementIds(createdElementId, parentIds); // Make sure this function doesn't start its own transaction
        }

        return createdElementId; // Return ID for fetching details later
    });


    try {
        const body: CreateSignatureElementInput = await req.json() as CreateSignatureElementInput;
        const validation = createSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        // Execute the transaction
        const finalElementId = await transaction(validation.data);

        await Log.info(`Element created: ${validation.data.name} (ID: ${finalElementId}) in component ${componentId}`, sessionAndUser.user.login, ELEMENT_AREA);

        // Fetch the newly created element with details to return
        const createdElementWithDetails = await getElementById(finalElementId, ['parents', 'component']); // Populate component too
        return new Response(JSON.stringify(createdElementWithDetails), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create element', sessionAndUser.user.login, ELEMENT_AREA, { componentId, input: req.json(), error });
        // Check for specific errors thrown from transaction (like component not found)
        if (error.message?.includes('Component with ID')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 400 }); // Bad Request - invalid component ID
        }
        return new Response(JSON.stringify({ message: 'Failed to create element', error: error.message }), { status: 500 });
    }
};


// --- Read All by Component ---
export const getElementsByComponentController = async (req: BunRequest<":componentId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const componentId = parseInt(req.params.componentId);
        if (isNaN(componentId)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

         // Optional: Check if component exists first
         const component = await getComponentById(componentId);
         if (!component) {
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
         }

        const elements = await getElementsByComponentId(componentId); // Already sorted by name
        return new Response(JSON.stringify(elements), { status: 200 });
    } catch (error) {
        await Log.error('Failed to fetch elements by component', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get elements' }), { status: 500 });
    }
};

// --- Read One ---
export const getElementByIdController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

     // Check for query parameters to control population
    const url = new URL(req.url);
    const populateParams = url.searchParams.get('populate')?.split(',') ?? [];
    const populateOptions: ('component' | 'parents')[] = [];
    if (populateParams.includes('component')) populateOptions.push('component');
    if (populateParams.includes('parents')) populateOptions.push('parents');

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        const element = await getElementById(id, populateOptions);
        if (!element) {
            return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(element), { status: 200 });

    } catch (error) {
        await Log.error('Error fetching element by ID', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get element' }), { status: 500 });
    }
};

// --- Update ---
export const updateElementController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Admins or regular users can update? Maybe depends on ownership if elements had owners.
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        const body: UpdateSignatureElementInput = await req.json() as UpdateSignatureElementInput;
        // Use safeParse for better error details
        const validation = updateSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { parentIds, ...updateData } = validation.data; // updateData includes name, description, index if present

        // Ensure element exists before update
        const existingElement = await getElementById(id);
        if (!existingElement) {
             return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        // Perform the core update (name, desc, index)
        // Note: updating index here does NOT affect the component counter
        const updatedElementData = await updateElement(id, updateData);
        if (!updatedElementData) {
             // Should be caught by check above, but handle potential race condition/error
             return new Response(JSON.stringify({ message: 'Element not found or update failed' }), { status: 404 });
        }

        // Update parent relationships if 'parentIds' was provided in the request
        // even if it's an empty array (meaning remove all parents)
        if (parentIds !== undefined) {
            await setParentElementIds(id, parentIds);
        }

        await Log.info(`Element updated: ${updatedElementData?.name} (ID: ${id})`, sessionAndUser.user.login, ELEMENT_AREA);
        // Fetch again with parents to return the updated state
        const updatedElementWithDetails = await getElementById(id, ['parents', 'component']); // Fetch component too
        return new Response(JSON.stringify(updatedElementWithDetails), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating element', sessionAndUser.user.login, ELEMENT_AREA, error);
        // Handle potential DB errors
        return new Response(JSON.stringify({ message: 'Failed to update element', error: error.message }), { status: 500 });
    }
};


// --- Delete ---
export const deleteElementController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can delete?
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        // Optional: Check existence first
        const existing = await getElementById(id);
        if (!existing) {
            return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        const deleted = await deleteElement(id); // DB handles cascade for parent relationships

        // Note: Deleting an element does NOT decrement the component counter.
        // Re-indexing is the way to fix potential gaps or reset the count.

        if (deleted) {
            await Log.info(`Element deleted: ID ${id}`, sessionAndUser.user.login, ELEMENT_AREA);
            return new Response(null, { status: 204 }); // No Content
        } else {
             return new Response(JSON.stringify({ message: 'Element not found during delete' }), { status: 404 });
        }
    } catch (error) {
        await Log.error('Failed to delete element', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to delete element' }), { status: 500 });
    }
};

// --- Search ---
export const searchElementsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;

        // Define allowed fields for direct searching on the 'signature_elements' table
        const allowedDirectFields: (keyof SignatureElement)[] = [
            'signatureElementId',
            'signatureComponentId',
            'name',
            'description',
            'index', // Add index to allowed fields
            'createdOn',
            'modifiedOn',
            // 'active' // if using soft delete
        ];
        // Define the primary key for distinct counting/sorting
        const primaryKey = 'signatureElementId';

        const { dataQuery, countQuery, page, pageSize } = buildSearchQueries<SignatureElement>(
            'signature_elements', // The main table to search
            searchRequest,
            allowedDirectFields,
            {
                // --- Custom Field Handlers ---
                // Handler for searching by parent element IDs
                'parentIds': elementParentSearchHandler,
                // Handler for checking if element has any parents
                'hasParents': elementParentSearchHandler,
                // Example: search by component name (requires JOIN)
                'componentName': (element, tableAlias): SearchOnCustomFieldHandlerResult => {
                    if (element.condition === 'FRAGMENT' && typeof element.value === 'string') {
                        return {
                            joinClause: `LEFT JOIN signature_components sc ON ${tableAlias}.signatureComponentId = sc.signatureComponentId`,
                            whereCondition: `sc.name LIKE ?`,
                            params: [`%${element.value}%`]
                        };
                    }
                     // Example: search by component name (exact match)
                    if (element.condition === 'EQ' && typeof element.value === 'string') {
                         return {
                            joinClause: `LEFT JOIN signature_components sc ON ${tableAlias}.signatureComponentId = sc.signatureComponentId`,
                            whereCondition: `sc.name = ?`,
                            params: [element.value]
                        };
                    }
                    return null; // Handler doesn't apply
                },
            },
            primaryKey
        );

        // Execute the search using the generic utility
        const searchResponse = await executeSearch<SignatureElementSearchResult>(dataQuery, countQuery);

        // Optional: Post-process results to add full parent details if needed
        // This can be N+1 if not careful, consider optimizing if required frequently
        // for (const element of searchResponse.data) {
        //     element.parentElements = await getParentElements(element.signatureElementId!);
        // }

        return new Response(JSON.stringify(searchResponse), { status: 200 });

    } catch (error: any) {
        await Log.error('Element search failed', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to search elements',
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};