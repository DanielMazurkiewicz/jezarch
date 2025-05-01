import { backupDatabaseController } from './controllers';

// Routes specifically for database administration (backup/restore)
export const adminDbRoutes = {
    // Download the entire database file
    '/api/admin/db/backup': {
        GET: backupDatabaseController,
    },
};