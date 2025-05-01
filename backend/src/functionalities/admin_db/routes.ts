import { backupDatabaseController, restoreDatabaseController } from './controllers';

// Routes specifically for database administration (backup/restore)
export const adminDbRoutes = {
    // Download the entire database file
    '/api/admin/db/backup': {
        GET: backupDatabaseController,
    },
    // Upload a database file to restore (saves temporarily)
    '/api/admin/db/restore': {
        PUT: restoreDatabaseController, // Use PUT for replacing/uploading resource state
    },
};