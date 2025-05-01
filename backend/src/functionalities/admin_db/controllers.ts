import { BunRequest } from 'bun';
import { existsSync, renameSync } from 'node:fs'; // Import fs modules
import { join, dirname } from 'node:path'; // Import path modules
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
import { AppParams } from '../../initialization/app_params';
import { db } from '../../initialization/db'; // Import db instance

const AREA = 'admin_db';
const TEMP_RESTORE_FILENAME = 'database-restore-upload.db.temp';

export const backupDatabaseController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const dbPath = AppParams.dbPath;
        if (!existsSync(dbPath)) {
            await Log.error('Database file not found for backup', sessionAndUser.user.login, AREA, { path: dbPath });
            return new Response(JSON.stringify({ message: 'Database file not found on server.' }), { status: 404 });
        }

        // Trigger database checkpoint before backup for WAL mode consistency
        try {
            db.exec('PRAGMA wal_checkpoint(TRUNCATE);'); // Or FULL or RESTART
            await Log.info('WAL checkpoint successful before backup', sessionAndUser.user.login, AREA);
        } catch (checkpointError: any) {
            await Log.warn('WAL checkpoint failed before backup, proceeding anyway', sessionAndUser.user.login, AREA, checkpointError);
            // Decide if you want to abort backup if checkpoint fails
            // return new Response(JSON.stringify({ message: 'Failed to prepare database for backup (checkpoint error).', error: checkpointError.message }), { status: 500 });
        }

        const file = Bun.file(dbPath);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `jezarch-backup-${timestamp}.sqlite.db`;

        await Log.info(`Initiating database backup download: ${filename}`, sessionAndUser.user.login, AREA);

        return new Response(file, {
            headers: {
                'Content-Type': 'application/vnd.sqlite3', // Correct MIME type for SQLite
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        await Log.error('Failed to process database backup request', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to generate database backup.', error: error.message }), { status: 500 });
    }
};

