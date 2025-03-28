import { getAllLogsController, searchLogsController } from './controllers';

export const logRoutes = {
    '/api/logs/all': {
        GET: getAllLogsController,
    },
    '/api/logs/search': {
        POST: searchLogsController,
    }
};
