import {
    createArchiveDocumentController,
    getArchiveDocumentByIdController,
    updateArchiveDocumentController,
    softDeleteArchiveDocumentController,
    restoreArchiveDocumentController,
    searchArchiveDocumentsController,
    // --- NEW: Import batch tagging controller ---
    batchTagArchiveDocumentsController,
    // --- END NEW ---
} from './controllers';

export const archiveDocumentRoutes = {

    // Create a new document/unit
    '/api/archive/document': {
        PUT: createArchiveDocumentController,
        // GET: getAllDocsController? // Maybe admin only? Add later if needed.
    },

    // Get, Update, Soft delete a specific document/unit
    '/api/archive/document/id/:id': {
        GET: getArchiveDocumentByIdController,       // Get by ID
        PATCH: updateArchiveDocumentController,      // Update (partial)
        DELETE: softDeleteArchiveDocumentController, // Soft delete
    },
    // Restore a soft-deleted document/unit
    '/api/archive/document/id/:id/restore': {
        POST: restoreArchiveDocumentController,
    },
    // Potential future routes:
    // '/api/archive/units/:id/children': { GET: getChildDocumentsController },
    // '/api/archive/documents/by-owner/:userId': { GET: getDocumentsByOwnerController },


    // '/api/archive/documents/all': {
    //     // GET: getAllDocsController? // Maybe admin only? Add later if needed.
    // },

     // Search documents/units
    '/api/archive/documents/search': {
        POST: searchArchiveDocumentsController,
    },

    // --- NEW: Batch Tagging Route ---
    '/api/archive/documents/batch-tag': {
        POST: batchTagArchiveDocumentsController, // For adding/removing tags based on search criteria
    },
    // --- END NEW ---
};