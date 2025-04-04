import { BunRequest } from 'bun';
import {
    createComponent,
    getAllComponents,
    getComponentById,
    updateComponent,
    deleteComponent,
    getComponentByName
} from './db';
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
import { createSignatureComponentSchema, updateSignatureComponentSchema, CreateSignatureComponentInput, UpdateSignatureComponentInput } from './models';

const COMPONENT_AREA = 'signature_component';

// --- Create ---
export const createComponentController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can create components? Adjust role as needed.
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const body: CreateSignatureComponentInput = await req.json() as CreateSignatureComponentInput;
        const validation = createSignatureComponentSchema.safeParse(body);
        if (!validation.success) {
            return new Response(JSON.stringify({ message: "Invalid input", errors: validation.error.format() }), { status: 400 });
        }
        const { name, description } = validation.data;

        // Check uniqueness before creation (optional, DB layer handles it too)
        // const existing = await getComponentByName(name);
        // if (existing) {
        //    return new Response(JSON.stringify({ message: `Component name '${name}' already exists` }), { status: 409 });
        // }

        const newComponent = await createComponent(name, description);
        await Log.info(`Component created: ${name} (ID: ${newComponent.signatureComponentId})`, sessionAndUser.user.login, COMPONENT_AREA);
        return new Response(JSON.stringify(newComponent), { status: 201 });

    } catch (error: any) {
        await Log.error('Failed to create component', sessionAndUser.user.login, COMPONENT_AREA, error);
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 }); // Conflict
        }
        return new Response(JSON.stringify({ message: 'Failed to create component' }), { status: 500 });
    }
};

// --- Read All ---
export const getAllComponentsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    // Allow regular users to read? Adjust as needed.
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

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
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

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
    // Only admins can update?
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

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

        // Ensure component exists before trying to update
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
        return new Response(JSON.stringify({ message: 'Failed to update component' }), { status: 500 });
    }
};

// --- Delete ---
export const deleteComponentController = async (req: BunRequest<":id">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
     // Only admins can delete?
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return new Response(JSON.stringify({ message: 'Invalid component ID' }), { status: 400 });
        }

        // Optional: Check if component exists before delete attempt
        const existing = await getComponentById(id);
        if (!existing) {
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }

        const deleted = await deleteComponent(id); // DB handles cascade to elements

        if (deleted) {
            await Log.info(`Component deleted: ID ${id}`, sessionAndUser.user.login, COMPONENT_AREA);
            // Return 204 No Content for successful deletion is common
             return new Response(null, { status: 204 });
            // Or return a confirmation message:
            // return new Response(JSON.stringify({ message: 'Component deleted successfully' }), { status: 200 });
        } else {
             // Should have been caught by the check above, but belt-and-suspenders
             return new Response(JSON.stringify({ message: 'Component not found' }), { status: 404 });
        }
    } catch (error) {
        await Log.error('Failed to delete component', sessionAndUser.user.login, COMPONENT_AREA, error);
        // Consider specific errors, e.g., if deletion is blocked due to constraints not handled by cascade
        return new Response(JSON.stringify({ message: 'Failed to delete component' }), { status: 500 });
    }
};