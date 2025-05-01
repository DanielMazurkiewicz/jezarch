import { BunRequest } from 'bun';
import { createTag, getAllTags, getTagById, updateTag, deleteTag, getTagByName } from './db';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
import { Tag } from './models'; // Import the Tag model

export const createTagController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admins and employees to create tags
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as Pick<Tag, 'name' | 'description'>;
        const name = body.name?.trim();
        const description = body.description;

        if (!name) {
            return new Response(JSON.stringify({ message: 'Tag name is required' }), { status: 400 });
        }

        const newTag = await createTag(name, description);
         if (!newTag) {
             const existing = await getTagByName(name);
             if (existing) return new Response(JSON.stringify(existing), { status: 200 });
             else throw new Error("Tag creation failed unexpectedly");
         }
        await Log.info(`Tag created: ${name}`, sessionAndUser.user.login, 'tag');
        return new Response(JSON.stringify(newTag), { status: 201 });
    } catch (error: any) {
        await Log.error('Failed to create tag', sessionAndUser.user.login, 'tag', error);
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 });
        }
        return new Response(JSON.stringify({ message: 'Failed to create tag' }), { status: 500 });
    }
};

export const getAllTagsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Allow admin and employees to get all tags. 'user' role cannot list all tags.
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

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
    // Allow admin and employees to get tag by ID. 'user' role cannot.
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });

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
    // Only admins can update tags? Or employees too? Let's restrict to admin for now.
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

        const existingTag = await getTagById(tagId);
        if (!existingTag) {
             return new Response(JSON.stringify({ message: 'Tag not found' }), { status: 404 });
        }

        await updateTag(tagId, name, description);
        await Log.info(`Tag updated: ID ${tagId}`, sessionAndUser.user.login, 'tag');
        const updatedTag = await getTagById(tagId); // Fetch again to return updated data
        return new Response(JSON.stringify(updatedTag), { status: 200 });

    } catch (error: any) {
        await Log.error('Error updating tag', sessionAndUser.user.login, 'tag', error);
        if (error.message?.includes('already exists')) {
             return new Response(JSON.stringify({ message: error.message }), { status: 409 });
        }
        return new Response(JSON.stringify({ message: 'Failed to update tag' }), { status: 500 });
    }
};

export const deleteTagController = async (req: BunRequest<":tagId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can delete tags
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const tagId = parseInt(req.params.tagId);
         if (isNaN(tagId)) {
            return new Response(JSON.stringify({ message: 'Invalid tag ID' }), { status: 400 });
        }

        const existingTag = await getTagById(tagId);
        if (!existingTag) {
             return new Response(JSON.stringify({ message: 'Tag not found' }), { status: 404 });
        }

        await deleteTag(tagId);
        await Log.info(`Tag deleted: ID ${tagId}`, sessionAndUser.user.login, 'tag');
        return new Response(JSON.stringify({ message: 'Tag deleted successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Failed to delete tag', sessionAndUser.user.login, 'tag', error);
        return new Response(JSON.stringify({ message: 'Failed to delete tag' }), { status: 500 });
    }
};