import { BunRequest } from 'bun';
import { createTag, getAllTags, getTagById, updateTag, deleteTag, getTagByName } from './db';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
import { Tag } from './models'; // Import the Tag model

export const createTagController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Decide who can create tags (e.g., anyone or just admins)
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as Pick<Tag, 'name' | 'description'>;
        const name = body.name?.trim();
        const description = body.description;

        if (!name) {
            return new Response(JSON.stringify({ message: 'Tag name is required' }), { status: 400 });
        }

        // Optional: Check if tag already exists by name before creating
        // const existingTag = await getTagByName(name);
        // if (existingTag) {
        //     return new Response(JSON.stringify({ message: `Tag '${name}' already exists` }), { status: 409 }); // Conflict
        // }

        const newTag = await createTag(name, description);
         if (!newTag) {
             // This might happen if findOrCreateTag logic is used and it finds an existing one
             const existing = await getTagByName(name);
             if (existing) return new Response(JSON.stringify(existing), { status: 200 }); // Or 409 if strict creation expected
             else throw new Error("Tag creation failed unexpectedly");
         }
        return new Response(JSON.stringify(newTag), { status: 201 });
    } catch (error: any) {
        await Log.error('Failed to create tag', sessionAndUser.user.login, 'tag', error);
         // Check for specific errors thrown from db layer
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 });
        }
        return new Response(JSON.stringify({ message: 'Failed to create tag' }), { status: 500 });
    }
};

export const getAllTagsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const tags = await getAllTags();
        return new Response(JSON.stringify(tags), { status: 200 });
    } catch (error) {
        await Log.error('Failed to fetch tags', sessionAndUser.user.login, 'tag', error);
        return new Response(JSON.stringify({ message: 'Failed to get tags' }), { status: 500 });
    }
};

export const getTagByIdController = async (req: BunRequest<":tagId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const tagId = parseInt(req.params.tagId);
        if (isNaN(tagId)) {
            return new Response(JSON.stringify({ message: 'Invalid tag ID' }), { status: 400 });
        }
        const tag = await getTagById(tagId);
        if (!tag) {
            return new Response(JSON.stringify({ message: 'Tag not found' }), { status: 404 });
        }
        return new Response(JSON.stringify(tag), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching tag by ID', sessionAndUser.user.login, 'tag', error);
        return new Response(JSON.stringify({ message: 'Failed to get tag' }), { status: 500 });
    }
};

export const updateTagController = async (req: BunRequest<":tagId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can update tags?
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const tagId = parseInt(req.params.tagId);
         if (isNaN(tagId)) {
            return new Response(JSON.stringify({ message: 'Invalid tag ID' }), { status: 400 });
        }
        const body = await req.json() as Partial<Pick<Tag, 'name' | 'description'>>;
        const name = body.name?.trim();
        const description = body.description; // Allow setting description to empty string or null implicitly

        if (name === "" ) { // Check for empty string explicitly if name is provided
             return new Response(JSON.stringify({ message: 'Tag name cannot be empty' }), { status: 400 });
        }

        // Fetch tag first to ensure it exists before updating
        const existingTag = await getTagById(tagId);
        if (!existingTag) {
             return new Response(JSON.stringify({ message: 'Tag not found' }), { status: 404 });
        }

        await updateTag(tagId, name, description);
        const updatedTag = await getTagById(tagId); // Fetch again to return updated data
        return new Response(JSON.stringify(updatedTag), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating tag', sessionAndUser.user.login, 'tag', error);
        // Check for specific errors thrown from db layer
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 });
        }
        return new Response(JSON.stringify({ message: 'Failed to update tag' }), { status: 500 });
    }
};

export const deleteTagController = async (req: BunRequest<":tagId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can delete tags?
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const tagId = parseInt(req.params.tagId);
         if (isNaN(tagId)) {
            return new Response(JSON.stringify({ message: 'Invalid tag ID' }), { status: 400 });
        }

        // Optional: Check if tag exists before attempting delete
        const existingTag = await getTagById(tagId);
        if (!existingTag) {
             return new Response(JSON.stringify({ message: 'Tag not found' }), { status: 404 });
        }

        await deleteTag(tagId);
        // Cascade delete in DB handles associations
        return new Response(JSON.stringify({ message: 'Tag deleted successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Failed to delete tag', sessionAndUser.user.login, 'tag', error);
        return new Response(JSON.stringify({ message: 'Failed to delete tag' }), { status: 500 });
    }
};