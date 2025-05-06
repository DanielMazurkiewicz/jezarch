import { getAllLogsController, searchLogsController, purgeLogsController } from './controllers'; // Added purgeLogsController

export const logRoutes = {
    // Deprecated: Use /search instead
    // '/api/logs/all': {
    //     GET: getAllLogsController,
    // },
    '/api/logs/search': {
        POST: searchLogsController,
    },
    // --- NEW: Route for purging logs ---
    '/api/logs/purge': {
        DELETE: purgeLogsController, // Use DELETE method for purging action
    }
    // --- END NEW ROUTE ---
};