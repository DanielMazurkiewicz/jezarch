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
    // Allow admin and employees to create elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    let componentId: number | null = null; // Keep track for logging/rollback info
    let createdElementId: number | null = null;

    const transaction = db.transaction(async (validatedData: CreateSignatureElementInput) => {
        const { signatureComponentId, name, description, index: providedIndex, parentIds } = validatedData;
        componentId = signatureComponentId;

        const component = await getComponentById(signatureComponentId);
        if (!component) {
            throw new Error(`Component with ID ${signatureComponentId} not found`);
        }

        let indexToUse: string | null = providedIndex ?? null;
        const newCount = await incrementComponentIndexCount(signatureComponentId);

        if (providedIndex === undefined || providedIndex === null) {
             indexToUse = formatIndex(newCount, component.index_type);
        }

        const newElement = await createElement(signatureComponentId, name, description, indexToUse);
        createdElementId = newElement.signatureElementId!;

        if (createdElementId && parentIds && parentIds.length > 0) {
            await setParentElementIds(createdElementId, parentIds);
        }

        return createdElementId;
    });


    try {
        const body: CreateSignatureElementInput = await req.json() as CreateSignatureElementInput;
        const validation = createSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const finalElementId = await transaction(validation.data);

        await Log.info(`Element created: ${validation.data.name} (ID: ${finalElementId}) in component ${componentId}`, sessionAndUser.user.login, ELEMENT_AREA);

        const createdElementWithDetails = await getElementById(finalElementId, ['parents', 'component']); // Populate component too
        return new Response(JSON.stringify(createdElementWithDetails), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create element', sessionAndUser.user.login, ELEMENT_AREA, { componentId, input: req.json(), error });
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
    // Allow admin and employees to read elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const componentId = parseInt(req.params.componentId);
        if (isNaN(componentId)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

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
    // Allow admin and employees to read elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

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
    // Allow admin and employees to update elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        const body: UpdateSignatureElementInput = await req.json() as UpdateSignatureElementInput;
        const validation = updateSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { parentIds, ...updateData } = validation.data;

        const existingElement = await getElementById(id);
        if (!existingElement) {
             return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        const updatedElementData = await updateElement(id, updateData);
        if (!updatedElementData) {
             return new Response(JSON.stringify({ message: 'Element not found or update failed' }), { status: 404 });
        }

        if (parentIds !== undefined) {
            await setParentElementIds(id, parentIds);
        }

        await Log.info(`Element updated: ${updatedElementData?.name} (ID: ${id})`, sessionAndUser.user.login, ELEMENT_AREA);
        const updatedElementWithDetails = await getElementById(id, ['parents', 'component']); // Fetch component too
        return new Response(JSON.stringify(updatedElementWithDetails), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating element', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to update element', error: error.message }), { status: 500 });
    }
};


// --- Delete ---
export const deleteElementController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to delete elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        const existing = await getElementById(id);
        if (!existing) {
            return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        const deleted = await deleteElement(id);

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
    // Allow admin and employees to search elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;

        const allowedDirectFields: (keyof SignatureElement)[] = [
            'signatureElementId', 'signatureComponentId', 'name',
            'description', 'index', 'createdOn', 'modifiedOn',
        ];
        const primaryKey = 'signatureElementId';

        const customHandlers: Record<string, (el: SearchQueryElement, alias: string) => SearchOnCustomFieldHandlerResult> = {
            'parentIds': elementParentSearchHandler,
            'hasParents': elementParentSearchHandler,
            'componentName': (element, tableAlias): SearchOnCustomFieldHandlerResult => {
                const joinClause = `LEFT JOIN signature_components sc ON ${tableAlias}.signatureComponentId = sc.signatureComponentId`;
                if (element.condition === 'FRAGMENT' && typeof element.value === 'string') {
                     return { joinClause, whereCondition: `sc.name LIKE ?`, params: [`%${element.value}%`] };
                 }
                 if (element.condition === 'EQ' && typeof element.value === 'string') {
                      return { joinClause, whereCondition: `sc.name = ?`, params: [element.value] };
                 }
                 return null;
            },
        };

        const { dataQuery, countQuery } = await buildSearchQueries<SignatureElement>(
            'signature_elements', searchRequest, allowedDirectFields, customHandlers, primaryKey
        );

        const searchResponse = await executeSearch<SignatureElementSearchResult>(dataQuery, countQuery);

        // Optional: Post-process results if needed

        return new Response(JSON.stringify(searchResponse), { status: 200 });

    } catch (error: any) {
        await Log.error('Element search failed', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to search elements',
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};