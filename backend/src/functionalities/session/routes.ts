import { validateSessionController } from './controllers';

export const sessionRoutes = {
    '/api/session/validate': {
        GET: validateSessionController,
    },
};
