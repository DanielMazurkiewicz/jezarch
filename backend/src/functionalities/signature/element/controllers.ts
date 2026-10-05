import { BunRequest } from 'bun';
import { db, runInTransaction } from '../../../initialization/db';
import {
    createElement,
    getElementById,
    updateElement,
    deleteElementWithTree,
    getElementsByComponentId,
    setParentElementIds,
    elementParentSearchHandler, // Import the handler
    getParentElements,
    // updateElementIndex // Not directly used here, part of re-index
} from './db';
import { getComponentById, incrementComponentIndexCount, upsertElementComponent } from '../component/db'; // Need component DB access + incrementer
import { effectiveComponentType } from '../component/models';
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
// Import search utilities, including SearchQueryElement
import { SearchQueryElement, SearchOnCustomFieldHandlerResult, SearchRequest, buildSearchQueries, executeSearch } from '../../../utils/search';
import { parseSearchRequest } from '../../../utils/search_validation';
import { removeSignatureElementIdsFromDocuments } from '../../archive/document/db';


const ELEMENT_AREA = 'signature_element';

/**
 * Derives the parent set for a new/updated element from its component kind:
 * - FLAT: use the caller-provided parentIds (legacy behavior).
 * - TREE: top-level tree nodes have no parents.
 * - ELEMENT: the single parent is the element mirrored by this component.
 */
const deriveParentIds = async (
    component: NonNullable<Awaited<ReturnType<typeof getComponentById>>>,
    requestedParentIds: number[] | undefined
): Promise<number[]> => {
    const compType = effectiveComponentType(component);
    if (compType === 'TREE') return [];
    if (compType === 'ELEMENT') {
        if (!component.element_id) return [];
        // Guard against a dangling mirror reference instead of failing the save.
        const parentExists = await getElementById(component.element_id);
        if (!parentExists) {
            await Log.warn(`Paired component ${component.signatureComponentId} references missing element ${component.element_id}; ignoring parent`, 'system', ELEMENT_AREA);
            return [];
        }
        return [component.element_id];
    }
    return requestedParentIds ?? [];
};

// --- Create ---
export const createElementController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to create elements
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    let componentId: number | null = null; // Keep track for logging/rollback info

    try {
        const body: CreateSignatureElementInput = await req.json() as CreateSignatureElementInput;
        const validation = createSignatureElementSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const { signatureComponentId, name, description, index: providedIndex, parentIds: requestedParentIds, index_type: providedIndexType } = validation.data;
        componentId = signatureComponentId;

        const component = await getComponentById(signatureComponentId);
        if (!component) {
            return new Response(JSON.stringify({ message: `Component with ID ${signatureComponentId} not found` }), { status: 400 });
        }
        const compType = effectiveComponentType(component);
        const parentIds = await deriveParentIds(component, requestedParentIds);

        // Element creation, index counting and the paired ELEMENT component
        // (TREE/ELEMENT components only) form one atomic unit.
        const finalElementId = await runInTransaction(async () => {
            const newCount = await incrementComponentIndexCount(signatureComponentId);
            const indexToUse: string | null = providedIndex ?? formatIndex(newCount, component.index_type);

            const newElement = await createElement(signatureComponentId, name, description, indexToUse);
            const createdId = newElement.signatureElementId!;

            if (compType === 'TREE' || compType === 'ELEMENT') {
                // Keep the paired ELEMENT component in sync: same name, same element id.
                await upsertElementComponent(createdId, name, providedIndexType ?? component.index_type);
            }
            return createdId;
        });

        // Parents are set after the element exists (setParentElementIds runs its
        // own transaction and must not be nested inside runInTransaction).
        if (parentIds.length > 0) {
            try {
                await setParentElementIds(finalElementId, parentIds);
            } catch (parentError: any) {
                await Log.error('Failed to set parent elements on create', sessionAndUser.user.login, ELEMENT_AREA, parentError);
                // Roll back the whole tree node created above.
                try {
                    await deleteElementWithTree(finalElementId);
                } catch (rollbackError) {
                    await Log.error('Rollback of newly created element failed', sessionAndUser.user.login, ELEMENT_AREA, rollbackError);
                }
                return new Response(JSON.stringify({ message: 'Failed to set parent elements' }), { status: 500 });
            }
        }

        await Log.info(`Element created: ${name} (ID: ${finalElementId}) in component ${componentId}`, sessionAndUser.user.login, ELEMENT_AREA);

        const createdElementWithDetails = await getElementById(finalElementId, ['parents', 'component']); // Populate component too
        return new Response(JSON.stringify(createdElementWithDetails), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create element', sessionAndUser.user.login, ELEMENT_AREA, { componentId, error });
        if (error.message?.includes('Component with ID')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 400 }); // Bad Request - invalid component ID
        }
        return new Response(JSON.stringify({ message: 'Failed to create element' }), { status: 500 });
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

        const { parentIds: requestedParentIds, index_type: providedIndexType, ...updateData } = validation.data;

        const existingElement = await getElementById(id);
        if (!existingElement) {
             return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        const component = await getComponentById(existingElement.signatureComponentId);
        if (!component) {
            return new Response(JSON.stringify({ message: 'Element component not found' }), { status: 404 });
        }
        const compType = effectiveComponentType(component);
        // For TREE/ELEMENT components the parent set is derived from the
        // component kind, never taken from the request.
        const parentIds = (compType === 'TREE' || compType === 'ELEMENT')
            ? await deriveParentIds(component, undefined)
            : requestedParentIds;

        // Core field update and the paired ELEMENT component sync (TREE/ELEMENT
        // components only) form one atomic unit.
        try {
            await runInTransaction(async () => {
                const updated = await updateElement(id, updateData);
                if (!updated) {
                     throw new Error('Element not found or update failed');
                }
                if (compType === 'TREE' || compType === 'ELEMENT') {
                    // Keep the paired component in sync: same name, index formatting.
                    const finalName = updateData.name ?? existingElement.name;
                    await upsertElementComponent(id, finalName, providedIndexType);
                }
            });
        } catch (txError: any) {
            if (txError.message === 'Element not found or update failed') {
                return new Response(JSON.stringify({ message: 'Element not found or update failed' }), { status: 404 });
            }
            throw txError;
        }

        // Parent replacement runs its own transaction and must not be nested.
        if (parentIds !== undefined) {
            try {
                await setParentElementIds(id, parentIds);
            } catch (parentError: any) {
                await Log.error('Failed to set parent elements on update', sessionAndUser.user.login, ELEMENT_AREA, parentError);
                return new Response(JSON.stringify({ message: 'Failed to set parent elements' }), { status: 500 });
            }
        }

        await Log.info(`Element updated: ${updateData.name ?? existingElement.name} (ID: ${id})`, sessionAndUser.user.login, ELEMENT_AREA);
        const updatedElementWithDetails = await getElementById(id, ['parents', 'component']); // Fetch component too
        return new Response(JSON.stringify(updatedElementWithDetails), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating element', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to update element' }), { status: 500 });
    }
};


// --- Delete ---
export const deleteElementController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Admin-only, matching component deletion: deleting elements corrupts the
    // signature paths stored inside archive documents (dangling ID references).
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid element ID' }), { status: 400 });
        }

        const existing = await getElementById(id);
        if (!existing) {
            return new Response(JSON.stringify({ message: 'Element not found' }), { status: 404 });
        }

        // Delete the element together with its paired ELEMENT component and the
        // whole subtree stored in it (TREE/ELEMENT hierarchies).
        const deletedIds = await deleteElementWithTree(id);

        // Strip now-dangling references from stored document signatures
        try {
            await removeSignatureElementIdsFromDocuments(deletedIds);
        } catch (cleanupError) {
            await Log.error('Failed to clean document signatures after element delete', sessionAndUser.user.login, ELEMENT_AREA, cleanupError);
        }
        await Log.info(`Element deleted: ID ${id} (${deletedIds.length} elements total)`, sessionAndUser.user.login, ELEMENT_AREA);
        return new Response(null, { status: 204 }); // No Content
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
        const rawBody: unknown = await req.json();
        const searchRequest = parseSearchRequest(rawBody);
        if (!searchRequest) {
            return new Response(JSON.stringify({ message: 'Invalid search request' }), { status: 400 });
        }

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
                     const likeClause = element.not ? `sc.name IS NULL OR NOT (sc.name LIKE ?)` : `sc.name LIKE ?`;
                     return { joinClause, whereCondition: likeClause, params: [`%${element.value}%`] };
                 }
                 if (element.condition === 'EQ' && typeof element.value === 'string') {
                     const eqClause = element.not ? `sc.name IS NULL OR NOT (sc.name = ?)` : `sc.name = ?`;
                     return { joinClause, whereCondition: eqClause, params: [element.value] };
                 }
                 return null;
            },
        };

        const { dataQuery, countQuery } = await buildSearchQueries<SignatureElement>(
            'signature_elements', searchRequest, allowedDirectFields, customHandlers, primaryKey
        );

        const searchResponse = await executeSearch<SignatureElementSearchResult>(dataQuery, countQuery);

        const results = searchResponse.data;
        if (results.length > 0) {
            const ids = results
                .map(r => r.signatureElementId!)
                .filter(id => id !== undefined);
            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                const childCountRows = db.prepare(
                    `SELECT parentElementId, COUNT(*) as cnt FROM signature_element_parents WHERE parentElementId IN (${placeholders}) GROUP BY parentElementId`
                ).all(...ids) as { parentElementId: number; cnt: number }[];
                const childCountMap = new Map<number, number>();
                for (const row of childCountRows) {
                    childCountMap.set(row.parentElementId, row.cnt);
                }
                for (const r of results) {
                    r.childCount = childCountMap.get(r.signatureElementId!) || 0;
                }
            }
        }

        return new Response(JSON.stringify(searchResponse), { status: 200 });

    } catch (error: any) {
        await Log.error('Element search failed', sessionAndUser.user.login, ELEMENT_AREA, error);
        return new Response(JSON.stringify({
            message: 'Failed to search elements',
        }), { status: 500 });
    }
};