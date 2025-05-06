import { db } from '../../initialization/db';
import type { LogEntry } from './models';
import { CmdParams } from '../../initialization/cmd'; // Import CmdParams
import { sqliteNow } from '../../utils/sqlite'; // Import sqliteNow

// initialization function
export async function initializeLogTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL CHECK(level IN ('info', 'error', 'warn')), -- Added 'warn' and constraint
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Keep default for safety
            userId TEXT,
            category TEXT,
            message TEXT NOT NULL,
            data TEXT
        )
    `);
    // Add index on createdOn for faster purging
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_log_created_on ON logs (createdOn);`);
}

const dbToSession = (data: any) => {
    if (data) {
        // Attempt to parse the date string correctly, regardless of format variations
        // SQLite usually stores as 'YYYY-MM-DD HH:MM:SS'
        const dateString = data.createdOn.replace(' ', 'T') + 'Z'; // Make it closer to ISO for robust parsing
        const parsedDate = new Date(dateString);
        return {
            ...data,
            // Use the parsed date; fallback to original string if parsing fails? No, Date object is better.
            createdOn: !isNaN(parsedDate.getTime()) ? parsedDate : new Date(), // Fallback to now if parse fails
        } as LogEntry;
    }
    return undefined;
}


// Deprecated - Use search query instead
export async function getAllLogs(): Promise<LogEntry[]> {
    const statement = db.prepare(`SELECT * FROM logs ORDER BY createdOn DESC`);
    const results = statement.all();
    // Apply parsing to each row safely
    return results.map(row => dbToSession(row)).filter(log => log !== undefined) as LogEntry[];
}


function serializeError(error: Error): object {
    if (!(error instanceof Error)) return error;

    const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
    };

    // Add any additional error properties
    Object.getOwnPropertyNames(error).forEach(key => {
        if (!['name', 'message', 'stack'].includes(key)) {
            // @ts-ignore Error has index signature implicitly
            serialized[key] = error[key];
        }
    });

    return serialized;
}

export async function logEntry(
    message: string,
    level: 'info' | 'error' | 'warn' = 'info', // Added 'warn'
    userId: string = 'system',
    category: string = 'general',
    data: any = undefined
): Promise<void> {

    const consoleTimestamp = new Date(); // Capture timestamp for console logging

    // --- Console Logging ---
    if (CmdParams.debugConsole) {
        let logFn = console.log; // Default to console.log
        if (level === 'error') {
            logFn = console.error;
        } else if (level === 'warn') {
            logFn = console.warn; // Use console.warn for warn level
        }

        const timestampStr = consoleTimestamp.toISOString(); // Use ISO format for console clarity
        logFn(`--- DEBUG LOG [${timestampStr}] ---`);
        logFn(`  Level: ${level.toUpperCase()}`);
        logFn(`  User: ${userId}`);
        logFn(`  Category: ${category}`);
        logFn(`  Message: ${message}`);
        if (data !== undefined) {
            // Process data for better console output, handle errors specially
            let processedDataForConsole = data;
             if (data instanceof Error) {
                 processedDataForConsole = serializeError(data);
             } else if (data?.error instanceof Error) {
                 processedDataForConsole = {
                     ...data,
                     error: serializeError(data.error)
                 };
             }
            try {
                // Use JSON.stringify for complex objects/arrays
                logFn(`  Data: ${JSON.stringify(processedDataForConsole, null, 2)}`);
            } catch (e) {
                 // Fallback if stringify fails (e.g., circular references)
                 logFn(`  Data: [Could not stringify: ${e instanceof Error ? e.message : String(e)}]`, processedDataForConsole);
            }
        }
        logFn('-----------------------------');
    }
    // --- End Console Logging ---

    try {
        // Handle Error instances for DB storage
        let processedDataForDb = data;
        if (data instanceof Error) {
            processedDataForDb = serializeError(data);
        } else if (data?.error instanceof Error) {
            // Handle cases where error is nested in an object
            processedDataForDb = {
                ...data,
                error: serializeError(data.error)
            };
        }

        // --- FIX: Use sqliteNow() directly, remove unnecessary fallback ---
        const dbTimestampValue = sqliteNow(); // sqliteNow() guarantees a string return value
        // --- End FIX ---

        const statement = db.prepare(
            `INSERT INTO logs (level, userId, category, message, data, createdOn)
             VALUES (?, ?, ?, ?, ?, ?)` // Explicitly insert createdOn
        );

        // Define params as a specific tuple type matching the values
        const params: [string, string, string, string, string | null, string] = [
            level,
            userId,
            category,
            message,
            processedDataForDb ? JSON.stringify(processedDataForDb) : null,
            dbTimestampValue // Now correctly inferred and assigned as string
        ];

        // Pass parameters using spread syntax.
        // Keep @ts-ignore as a safety net if Bun's types remain strict.
        // @ts-ignore
        statement.run(...params);

    } catch (dbError) {
        const errorTimestamp = new Date().toISOString();
        // Fallback to console.error if DB logging itself fails
        console.error('=== DATABASE LOGGING ERROR ===');
        console.error('Original DB Write Error:', dbError);
        console.error(`[${errorTimestamp}] [${level.toUpperCase()}] [User: ${userId}] [Category: ${category}] ${message}`);
        if (data) {
            console.error('Original Log Data:', data);
        }
        console.error('=============================');
    }
}


export const Log = {
    info: async (message: string, user?: string, category?: string, data?: any) => {
        await logEntry(message, 'info', user ?? 'system', category ?? 'general', data);
    },
    warn: async (message: string, user?: string, category?: string, data?: any) => { // Added warn method
        await logEntry(message, 'warn', user ?? 'system', category ?? 'general', data);
    },
    error: async (message: string, user?: string, category?: string, data?: any) => {
        await logEntry(message, 'error', user ?? 'system', category ?? 'general', data);
    }
};

// --- NEW: Function to purge old logs ---
/**
 * Deletes log entries older than the specified number of days.
 * @param days The minimum age in days for logs to be deleted. Must be a positive integer.
 * @returns The number of log entries deleted.
 */
export async function purgeLogsOlderThan(days: number): Promise<number> {
    if (!Number.isInteger(days) || days <= 0) {
        throw new Error("Invalid number of days provided for purging logs. Must be a positive integer.");
    }

    try {
        // Use SQLite's datetime function for reliable date comparison
        // datetime('now', '-X days') calculates the timestamp X days ago
        const statement = db.prepare(`
            DELETE FROM logs
            WHERE createdOn < datetime('now', '-' || ? || ' days')
        `);

        const result = statement.run(String(days)); // Pass days as string for the modifier

        console.log(`Purged ${result.changes} logs older than ${days} days.`);
        return result.changes; // Return the number of affected rows

    } catch (error) {
        await Log.error('Failed to purge old logs', 'system', 'database', { days, error });
        throw error; // Re-throw for the controller to handle
    }
}
// --- END NEW FUNCTION ---