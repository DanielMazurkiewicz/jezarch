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
    '/api/signature/element': {
        POST: createElementController,
    },

    // Get/Update/Delete specific element
    '/api/signature/element/:id': {
        GET: getElementByIdController,    // Get element by ID (add ?populate=parents,component)
        PATCH: updateElementController,   // Update element (partial)
        DELETE: deleteElementController,  // Delete element
    },
    
    // Search elements
    '/api/signature/elements/search': {
        POST: searchElementsController,
    },
    // Get all elements for a specific component
    '/api/signature/components/id/:componentId/elements/all': {
        GET: getElementsByComponentController,
    },
};