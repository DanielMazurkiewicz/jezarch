import { db } from '../../initialization/db';
import { AppConfigKeys } from './models';

// initialization function - No changes needed for schema
export async function initializeConfigTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL
        )
    `);
}

// operation functions - No changes needed for basic get/set
// Added return type annotation for clarity
export async function getConfig(key: AppConfigKeys): Promise<string | undefined> {
    const statement = db.prepare<{value: string}, [string]>(`SELECT value FROM config WHERE key = ?`);
    const row = await statement.get(key);
    // Return row.value directly, or undefined if row is null/undefined
    return row?.value;
}

export async function setConfig(key: AppConfigKeys, value: string) {
    // Use INSERT OR REPLACE to handle both creation and update
    const statement = db.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`);
    await statement.run(key, value);
}