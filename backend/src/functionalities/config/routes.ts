import { getConfigController, setConfigController, clearHttpsConfigController, getDefaultLanguageController } from './controllers';
// Removed sslControllers import as those routes are gone

export const configRoutes = {
    // --- NEW: Public route for default language ---
    '/api/config/default-language': {
      GET: getDefaultLanguageController, // Publicly accessible
    },
    // --- END NEW ROUTE ---

    // Authenticated routes for getting/setting specific configs
    '/api/configs/:key': {
        GET: getConfigController, // Requires authentication (admin/employee depending on key)
        PUT: setConfigController, // Requires admin authentication
    },
    // Route to clear all HTTPS settings (Admin only)
    '/api/config/https': {
        DELETE: clearHttpsConfigController, // Requires admin authentication
    },

    // Removed specific SSL upload/generate routes
    // '/api/config/ssl/upload': { ... },
    // '/api/config/ssl/generate': { ... },
};