import { BunRequest } from 'bun';
import {
    createElement,
    getElementById,
    updateElement,
    deleteElement,
    getElementsByComponentId,
    setParentElementIds,
    elementParentSearchHandler, // Import the handler
    getParentElements
} from './db';
import { getComponentById } from '../component/db'; // Need component DB access
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
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
    // Admins or regular users can create?
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateSignatureElementInput = await req.json() as CreateSignatureElementInput;
        const validation = createSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }
        const { signatureComponentId, name, description, parentIds } = validation.data;

        // Verify component exists
        const component = await getComponentById(signatureComponentId);
        if (!component) {
            return new Response(JSON.stringify({ message: `Component with ID ${signatureComponentId} not found` }), { status: 400 }); // Bad Request - invalid component ID provided
        }

        // Optional: Verify parent elements exist (or let DB handle it gracefully)
        // if (parentIds && parentIds.length > 0) {
        //    // ... check each parentId ...
        // }

        const newElement = await createElement(signatureComponentId, name, description);

        // Set parent relationships if provided
        if (newElement.signatureElementId && parentIds && parentIds.length > 0) {
            await setParentElementIds(newElement.signatureElementId, parentIds);
        }

        await Log.info(`Element created: ${name} (ID: ${newElement.signatureElementId})`, sessionAndUser.user.login, ELEMENT_AREA);
        // Fetch the element again with parents to return the full representation? Or just the basic element?
        const createdElementWithDetails = await getElementById(newElement.signatureElementId!, ['parents']);
        return new Response(JSON.stringify(createdElementWithDetails), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create element', sessionAndUser.user.login, ELEMENT_AREA, error);
        // Handle potential DB errors (e.g., foreign key if component check was skipped)
        return new Response(JSON.stringify({ message: 'Failed to create element' }), { status: 500 });
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

        const elements = await getElementsByComponentId(componentId);
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

        const { parentIds, ...updateData } = validation.data;

        // Ensure element exists before update
        const existingElement = await getElementById(id);
        if (!existingElement) {
             return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        // Perform the core update
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
        const updatedElementWithDetails = await getElementById(id, ['parents']);
        return new Response(JSON.stringify(updatedElementWithDetails), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating element', sessionAndUser.user.login, ELEMENT_AREA, error);
        // Handle potential DB errors
        return new Response(JSON.stringify({ message: 'Failed to update element' }), { status: 500 });
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