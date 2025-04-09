import {
    createArchiveDocumentController,
    getArchiveDocumentByIdController,
    updateArchiveDocumentController,
    disableArchiveDocumentController,
    searchArchiveDocumentsController
} from './controllers';

export const archiveDocumentRoutes = {

    // Create a new document/unit
    '/api/archive/document': {
        PUT: createArchiveDocumentController,
        // GET: getAllDocsController? // Maybe admin only? Add later if needed.
    },

    // Get, Update, Disable (soft delete) a specific document/unit
    '/api/archive/document/id/:id': {
        GET: getArchiveDocumentByIdController,    // Get by ID
        PATCH: updateArchiveDocumentController,   // Update (partial)
        DELETE: disableArchiveDocumentController, // Disable (soft delete)
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
};