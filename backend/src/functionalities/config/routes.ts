import { getConfigController, setConfigController } from './controllers';
import { sslControllers } from './ssl/controllers';

export const configRoutes = {
    '/api/configs/:key': {
        GET: getConfigController,
        PUT: setConfigController,
    },
    '/api/config/ssl/upload': {
        PUT: sslControllers.uploadSslController,
    },
    '/api/config/ssl/generate': {
        POST: sslControllers.generateSslController,
    },
};
