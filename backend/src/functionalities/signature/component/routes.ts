import {
    createComponentController,
    getAllComponentsController,
    getComponentByIdController,
    updateComponentController,
    deleteComponentController
} from './controllers';

export const signatureComponentRoutes = {
    '/api/signature/components': {
        POST: createComponentController,  // Create new component (use POST for creation)
        GET: getAllComponentsController,   // Get all components
    },
    '/api/signature/components/:id': {
        GET: getComponentByIdController,    // Get component by ID
        PATCH: updateComponentController,  // Update component (use PATCH for partial updates)
        DELETE: deleteComponentController, // Delete component
    },
};