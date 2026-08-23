import { BunRequest } from 'bun';
import { existsSync, unlinkSync } from 'node:fs'; // Import fs modules
import { join } from 'node:path'; // Import path modules
import { tmpdir } from 'node:os';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
import { AppParams } from '../../initialization/app_params';
import { db } from '../../initialization/db'; // Import db instance

const AREA = 'admin_db';

export const backupDatabaseController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    let snapshotPath: string | null = null;
    try {
        const dbPath = AppParams.dbPath;
        if (!existsSync(dbPath)) {
            await Log.error('Database file not found for backup', sessionAndUser.user.login, AREA, { path: dbPath });
            return new Response(JSON.stringify({ message: 'Database file not found on server.' }), { status: 404 });
        }

        // VACUUM INTO produces a fully consistent snapshot of the LIVE
        // connection (WAL content included) instead of streaming the main
        // file, which can be torn while writes are in flight.
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `jezarch-backup-${timestamp}.sqlite.db`;
        snapshotPath = join(tmpdir(), `jezarch-snapshot-${process.pid}-${timestamp}.db`);
        db.exec(`VACUUM INTO '${snapshotPath.replace(/'/g, "''")}'`);

        const file = Bun.file(snapshotPath);
        if (!(await file.exists()) || (await file.size) === 0) {
            throw new Error('Backup snapshot is empty');
        }
        // Buffer the snapshot so the temp file can be deleted immediately
        // (a lazy stream plus delayed cleanup risks truncated downloads).
        const snapshotBuffer = await file.arrayBuffer();

        await Log.info(`Initiating database backup download: ${filename}`, sessionAndUser.user.login, AREA);

        return new Response(snapshotBuffer, {
            headers: {
                'Content-Type': 'application/vnd.sqlite3', // Correct MIME type for SQLite
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        await Log.error('Failed to process database backup request', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to generate database backup.' }), { status: 500 });
    } finally {
        if (snapshotPath) {
            try { unlinkSync(snapshotPath); } catch { /* already gone */ }
        }
    }
};


