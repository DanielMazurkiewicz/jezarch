import {
    createElementController,
    getElementsByComponentController,
    getElementByIdController,
    updateElementController,
    deleteElementController,
    searchElementsController
} from './controllers';

export const signatureElementRoutes = {
    // Create element (implicitly linked to component via body)
    '/api/signature/elements': {
        POST: createElementController,
    },
     // Search elements
    '/api/signature/elements/search': {
        POST: searchElementsController,
    },
    // Get/Update/Delete specific element
    '/api/signature/elements/:id': {
        GET: getElementByIdController,    // Get element by ID (add ?populate=parents,component)
        PATCH: updateElementController,   // Update element (partial)
        DELETE: deleteElementController,  // Delete element
    },
    // Get all elements for a specific component
    '/api/signature/components/:componentId/elements': {
        GET: getElementsByComponentController,
    },
};