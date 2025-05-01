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


export const restoreDatabaseController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const formData = await req.formData();
        const file = formData.get('dbfile') as File | null; // Assuming input name is 'dbfile'

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ message: 'No database file uploaded or invalid format.' }), { status: 400 });
        }

        // Basic check for filename (could be stronger by checking content type if reliable)
        if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite') && !file.name.endsWith('.sqlite3')) {
             return new Response(JSON.stringify({ message: 'Invalid file type. Please upload a SQLite database file (.db, .sqlite, .sqlite3).' }), { status: 400 });
        }

        // Check file size (e.g., max 100MB)
        const maxSize = 100 * 1024 * 1024; // 100 MB
        if (file.size > maxSize) {
             return new Response(JSON.stringify({ message: `File size exceeds limit (${maxSize / 1024 / 1024}MB).` }), { status: 413 }); // Payload Too Large
        }


        // Determine temporary path in the same directory as the current DB
        const currentDbDir = dirname(AppParams.dbPath);
        const tempRestorePath = join(currentDbDir, TEMP_RESTORE_FILENAME);

        // Save the uploaded file to the temporary location
        await Bun.write(tempRestorePath, file);

        // --- Basic SQLite Header Check ---
        // Read the first 16 bytes to check the SQLite header string
        const buffer = new ArrayBuffer(16);
        const fileHandle = Bun.file(tempRestorePath);
        const stream = await fileHandle.stream();
        const reader = stream.getReader();
        const { value, done } = await reader.read(new Uint8Array(buffer));
        reader.releaseLock(); // Release lock after reading

        if (!done && value) {
             const headerString = new TextDecoder().decode(value.slice(0, 16));
             if (headerString !== "SQLite format 3\u0000") {
                 // Clean up the invalid uploaded file
                 await Bun.write(tempRestorePath, ""); // Or fs.unlinkSync(tempRestorePath);
                 await Log.warn(`Uploaded file is not a valid SQLite3 database (header mismatch)`, sessionAndUser.user.login, AREA, { filename: file.name });
                 return new Response(JSON.stringify({ message: 'Uploaded file is not a valid SQLite 3 database.' }), { status: 400 });
             }
         } else {
             // Clean up if read failed
             await Bun.write(tempRestorePath, "");
             await Log.error(`Failed to read header from uploaded database file`, sessionAndUser.user.login, AREA, { filename: file.name });
             return new Response(JSON.stringify({ message: 'Could not verify uploaded database file header.' }), { status: 500 });
         }
        // --- End Header Check ---


        await Log.info(`Database restore file uploaded successfully: ${file.name} -> ${TEMP_RESTORE_FILENAME}`, sessionAndUser.user.login, AREA);

        // IMPORTANT: Respond with instructions for manual replacement
        return new Response(JSON.stringify({
            message: `Database backup uploaded successfully as ${TEMP_RESTORE_FILENAME}.`,
            instructions: `To complete the restore:\n1. Stop the JezArch server.\n2. Go to the server's data directory (${currentDbDir}).\n3. (Optional but recommended) Backup your current database file ('${AppParams.dbPath.split('/').pop()}').\n4. Rename or delete the current database file.\n5. Rename '${TEMP_RESTORE_FILENAME}' to '${AppParams.dbPath.split('/').pop()}'.\n6. Restart the JezArch server.`,
            tempFilePath: tempRestorePath // Optional: provide the full path for reference
        }), { status: 200 });

    } catch (error: any) {
        await Log.error('Failed to process database restore upload', sessionAndUser.user.login, AREA, error);
        return new Response(JSON.stringify({ message: 'Failed to upload database restore file.', error: error.message }), { status: 500 });
    }
};