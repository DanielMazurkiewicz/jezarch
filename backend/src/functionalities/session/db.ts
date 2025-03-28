import { db } from '../../initialization/db';
import { sqliteDate } from '../../utils/sqlite';
import type { Session } from './models';
import * as crypto from 'node:crypto'; // Import Bun's crypto module

// initialization function
export async function initializeSessionTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
            sessionId INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            createdOn DATETIME DEFAULT CURRENT_TIMESTAMP,
            expiresOn DATETIME NOT NULL,
            FOREIGN KEY (userId) REFERENCES users(userId)
        )
    `);
}

const dbToSession = (data: any) => {
    if (data) {
        return {
            ...data,
            createdOn: new Date(data.createdOn),
            expiresOn: new Date(data.expiresOn)
        } as Session;
    }
    return undefined;
} 

// operation functions
export async function createSession(userId: number) {
    const token = crypto.randomUUID(); // Generate a unique session token
    const timestampNow = Date.now(); // Milliseconds since epoch
    const timestampExpiresOn = timestampNow + 24 * 60 * 60 * 1000; // Session expires in 24 hours

    const statement = db.prepare(`INSERT INTO sessions (userId, token, expiresOn) VALUES (?, ?, ?)`);
    statement.run(userId, token, sqliteDate(timestampExpiresOn) as string);

    return token;
}

export async function getSessionByToken(token: string) {
    const statement = db.prepare(`SELECT * FROM sessions WHERE token = ? AND expiresOn > DATETIME('now')`);
    const row = await statement.get(token);
    return dbToSession(row);
}

export async function deleteSession(token: string) {
    const statement = db.prepare(`DELETE FROM sessions WHERE token = ?`);
    await statement.run(token);
}
