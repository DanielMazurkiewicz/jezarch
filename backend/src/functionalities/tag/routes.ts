import {
    createTagController,
    getAllTagsController,
    getTagByIdController,
    updateTagController,
    deleteTagController
} from './controllers';

export const tagRoutes = {
    '/api/tags': {
        POST: createTagController, // Create a new tag
        GET: getAllTagsController,  // Get all tags
    },
    '/api/tags/:tagId': {
        GET: getTagByIdController,    // Get a specific tag by ID
        PATCH: updateTagController,   // Update a specific tag (partial update)
        // PUT: updateTagController, // Could use PUT for full replacement if desired
        DELETE: deleteTagController,  // Delete a specific tag
    },
};