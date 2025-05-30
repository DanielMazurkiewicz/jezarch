import { BunRequest } from 'bun';
import { db } from '../../../initialization/db'; // Import db for transaction
import {
    createComponent,
    getAllComponents,
    getComponentById,
    updateComponent,
    deleteComponent,
    getComponentByName,
    resetComponentIndexCount, // Import counter functions
    setComponentIndexCount,
} from './db';
import {
    getElementsByComponentId, // Need element DB access
    updateElementIndex,         // Need element index update function
} from '../element/db';
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
import { formatIndex } from '../../../utils/formatIndex'; // Import formatter
import { createSignatureComponentSchema, updateSignatureComponentSchema, CreateSignatureComponentInput, UpdateSignatureComponentInput } from './models';

const COMPONENT_AREA = 'signature_component';

// --- Create ---
export const createComponentController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins and employees can create components
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateSignatureComponentInput = await req.json() as CreateSignatureComponentInput;
        const validation = createSignatureComponentSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }
        const { name, description, index_type } = validation.data;

        const newComponent = await createComponent(name, description, index_type);
        await Log.info(`Component created: ${name} (ID: ${newComponent.signatureComponentId})`, sessionAndUser.user.login, COMPONENT_AREA);
        return new Response(JSON.stringify(newComponent), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create component', sessionAndUser.user.login, COMPONENT_AREA, error);
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 }); // Conflict
        }
         if (error.message?.includes('Invalid index_type')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 400 });
         }
        return new Response(JSON.stringify({ message: 'Failed to create component' }), { status: 500 });
    }
};


// --- Read All ---
export const getAllComponentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to read components. 'user' role cannot.
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const components = await getAllComponents();
        return new Response(JSON.stringify(components), { status: 200 });
    } catch (error) {
        await Log.error('Failed to fetch components', sessionAndUser?.user?.login ?? 'anonymous', COMPONENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get components' }), { status: 500 });
    }
};

// --- Read One ---
export const getComponentByIdController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to read component by ID. 'user' role cannot.
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

        const component = await getComponentById(id);
        if (!component) {
            return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(component), { status: 200 });

    } catch (error) {
        await Log.error('Error fetching component by ID', sessionAndUser.user.login, COMPONENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to get component' }), { status: 500 });
    }
};


// --- Update ---
export const updateComponentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins and employees can update components
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

        const body: UpdateSignatureComponentInput = await req.json() as UpdateSignatureComponentInput;
        const validation = updateSignatureComponentSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }

        const existingComponent = await getComponentById(id);
        if (!existingComponent) {
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }

        const updatedComponent = await updateComponent(id, validation.data);
        await Log.info(`Component updated: ${updatedComponent?.name} (ID: ${id})`, sessionAndUser.user.login, COMPONENT_AREA);
        return new Response(JSON.stringify(updatedComponent), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating component', sessionAndUser.user.login, COMPONENT_AREA, error);
         if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 });
        }
         if (error.message?.includes('Invalid index_type')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 400 });
         }
        return new Response(JSON.stringify({ message: 'Failed to update component' }), { status: 500 });
    }
};


// --- Delete ---
export const deleteComponentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
     // Only admins can delete components (potential data loss risk)
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

        const existing = await getComponentById(id);
        if (!existing) {
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }

        const deleted = await deleteComponent(id); // DB handles cascade to elements

        if (deleted) {
            await Log.info(`Component deleted: ID ${id}`, sessionAndUser.user.login, COMPONENT_AREA);
             return new Response(null, { status: 204 });
        } else {
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }
    } catch (error) {
        await Log.error('Failed to delete component', sessionAndUser.user.login, COMPONENT_AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to delete component' }), { status: 500 });
    }
};

// --- Re-index Elements ---
export const reindexComponentElementsController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins should re-index
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    let componentId: number | null = null; // For logging

    // Use a transaction for the entire re-indexing process
    const transaction = db.transaction(async (compId: number) => {
        componentId = compId; // Store for outer scope

        const component = await getComponentById(compId);
        if (!component) {
            throw new Error(`Component with ID ${compId} not found`);
        }

        const elements = await getElementsByComponentId(compId); // Sorted by name
        await resetComponentIndexCount(compId);

        let currentCount = 0;
        for (const element of elements) {
            currentCount++;
            const newIndex = formatIndex(currentCount, component.index_type);
            await updateElementIndex(element.signatureElementId!, newIndex);
        }
        await setComponentIndexCount(compId, currentCount);
        return currentCount;
    });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

        const reindexedCount = await transaction(id);

        await Log.info(`Re-indexed ${reindexedCount} elements for component ID ${id}`, sessionAndUser.user.login, COMPONENT_AREA);
        return new Response(JSON.stringify({ message: `Successfully re-indexed ${reindexedCount} elements.`, finalCount: reindexedCount }), { status: 200 });

    } catch (error: any) {
        await Log.error(`Failed to re-index elements for component ID ${componentId}`, sessionAndUser.user.login, COMPONENT_AREA, error);
        if (error.message?.includes('Component with ID')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 404 }); // Component not found
        }
        if (error.message?.includes('Element with ID')) {
             return new Response(JSON.stringify({ message: "Re-indexing failed during element update", error: error.message }), { status: 500 });
        }
        return new Response(JSON.stringify({ message: 'Failed to re-index elements', error: error.message }), { status: 500 });
    }
};