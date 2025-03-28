import { db } from '../../initialization/db';
import { AppConfigKeys } from './models';

// initialization function
export async function initializeConfigTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL
        )
    `);
}

// operation functions
export async function getConfig(key: AppConfigKeys): Promise<string | undefined> {
    const statement = db.prepare<string, string>(`SELECT value FROM config WHERE key = ?`);
    const row = await statement.get(key);

    return row || undefined;
}

export async function setConfig(key: AppConfigKeys, value: string) {
    const statement = db.prepare(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`);
    await statement.run(key, value);
}

