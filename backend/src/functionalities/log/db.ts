import { db } from '../../initialization/db';
import type { LogEntry } from './models';

// initialization function
export async function initializeLogTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            userId TEXT,
            category TEXT,
            message TEXT NOT NULL,
            data TEXT
        )
    `);
}

const dbToSession = (data: any) => {
    if (data) {
        return {
            ...data,
            createdOn: new Date(data.createdOn),
        } as LogEntry;
    }
    return undefined;
} 


export async function getAllLogs(): Promise<LogEntry[]> {
    const statement = db.prepare(`SELECT * FROM logs ORDER BY createdOn DESC`);
    return statement.all().map(dbToSession) as LogEntry[];
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
            serialized[key] = error[key as keyof Error];
        }
    });

    return serialized;
}

export async function logEntry(
    message: string, 
    level: 'info' | 'error' = 'info', 
    userId: string = 'system', 
    category: string = 'general',
    data: any = undefined
): Promise<void> {


    try {
        // Handle Error instances
        let processedData = data;
        if (data instanceof Error) {
            processedData = serializeError(data);
        } else if (data?.error instanceof Error) {
            // Handle cases where error is nested in an object
            processedData = {
                ...data,
                error: serializeError(data.error)
            };
        }

        const statement = db.prepare(
            `INSERT INTO logs (level, userId, category, message, data) 
             VALUES (?, ?, ?, ?, ?)`
        );
        
        statement.run(
            level,
            userId,
            category,
            message,
            processedData ? JSON.stringify(processedData) : null
        );
    } catch (error) {
        const createdOn = new Date().toISOString();

        console.error('=== LOGGING ERROR ===');
        console.error('Original error:', error);
        console.error(`[${createdOn}] [${level.toUpperCase()}] [User: ${userId || 'system'}] [Category: ${category}] ${message}`);
    }
}


export const Log = {
    info: async (message: string, user?: string, category?: string, data?: any) => {
        await logEntry(message, 'info', user, category, data);
    },
    error: async (message: string, user?: string, category?: string, data?: any) => {
        await logEntry(message, 'error', user, category, data);
    }
};

