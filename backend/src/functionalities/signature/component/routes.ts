// backend/src/functionalities/signature/component/routes.ts
import {
    createComponentController,
    getAllComponentsController,
    getComponentByIdController,
    updateComponentController,
    deleteComponentController,
    reindexComponentElementsController // Import new controller
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
     // New route for re-indexing elements of a specific component
    '/api/signature/components/:id/reindex': {
        POST: reindexComponentElementsController, // Use POST as it modifies data state
    },
};