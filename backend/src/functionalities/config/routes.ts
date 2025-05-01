import { getConfigController, setConfigController } from './controllers';
import { sslControllers } from './ssl/controllers';

export const configRoutes = {
    // Changed PUT route to accept key in URL
    '/api/configs/:key': {
        GET: getConfigController,
        PUT: setConfigController, // Handles key from URL, value from body
    },
    // SSL routes remain the same
    '/api/config/ssl/upload': {
        PUT: sslControllers.uploadSslController,
    },
    '/api/config/ssl/generate': {
        POST: sslControllers.generateSslController,
    },
};