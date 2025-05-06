import { getConfigController, setConfigController, clearHttpsConfigController } from './controllers';
// Removed sslControllers import as those routes are gone

export const configRoutes = {
    // Route remains the same, uses :key parameter
    '/api/configs/:key': {
        GET: getConfigController,
        PUT: setConfigController, // Handles key from URL, value from body
    },
    // --- NEW: Route to clear all HTTPS settings ---
    '/api/config/https': {
        DELETE: clearHttpsConfigController, // Use DELETE method for clearing action
    },
    // --- END NEW ROUTE ---

    // Removed specific SSL upload/generate routes
    // '/api/config/ssl/upload': { ... },
    // '/api/config/ssl/generate': { ... },
};