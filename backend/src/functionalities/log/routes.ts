import { searchLogsController, purgeLogsController } from './controllers';

export const logRoutes = {
    '/api/logs/search': {
        POST: searchLogsController,
    },
    // Purge log entries older than N days
    '/api/logs/purge': {
        DELETE: purgeLogsController,
    }
};
