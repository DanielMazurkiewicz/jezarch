import {
    createTagController,
    getAllTagsController,
    getTagByIdController,
    updateTagController,
    deleteTagController
} from './controllers';

export const tagRoutes = {
    '/api/tag': {
        PUT: createTagController, // Create a new tag
    },
    '/api/tag/id/:tagId': {
        GET: getTagByIdController,    // Get a specific tag by ID
        PATCH: updateTagController,   // Update a specific tag (partial update)
        DELETE: deleteTagController,  // Delete a specific tag
    },
    '/api/tags': {
        GET: getAllTagsController,  // Get all tags
    },

};