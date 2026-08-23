import { db } from '../../initialization/db';
import { sqliteDate } from '../../utils/sqlite';
import type { Session } from './models';
import * as crypto from 'node:crypto';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (token);`);
}

// Sessions are stored hashed (SHA-256) so a database backup/leak does not
// directly yield usable bearer tokens. Legacy plaintext rows are upgraded
// lazily on first lookup.
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

const rowToSession = (data: any) => {
    if (data) {
        return {
            ...data,
            createdOn: new Date(data.createdOn + 'Z'),
            expiresOn: new Date(data.expiresOn + 'Z')
        } as Session;
    }
    return undefined;
} 

// operation functions
export async function createSession(userId: number) {
    const token = crypto.randomUUID(); // Generate a unique session token
    const timestampNow = Date.now(); // Milliseconds since epoch
    const timestampExpiresOn = timestampNow + SESSION_TTL_MS; // Session expires in 24 hours

    // Opportunistic cleanup of expired sessions (they are otherwise never purged)
    try {
        db.prepare(`DELETE FROM sessions WHERE expiresOn <= DATETIME('now')`).run();
    } catch {
        // Non-fatal: cleanup is best-effort
    }

    const statement = db.prepare(`INSERT INTO sessions (userId, token, expiresOn) VALUES (?, ?, ?)`);
    statement.run(userId, hashToken(token), sqliteDate(timestampExpiresOn) as string);

    return token;
}

export async function getSessionByToken(token: string) {
    const statement = db.prepare(`SELECT * FROM sessions WHERE token = ? AND expiresOn > DATETIME('now')`);
    const row = await statement.get(hashToken(token));
    if (row) return rowToSession(row);

    // Legacy fallback: upgrade an old plaintext-token row to the hashed form
    const legacyRow = await statement.get(token);
    if (legacyRow) {
        try {
            db.prepare(`UPDATE sessions SET token = ? WHERE sessionId = ?`).run(hashToken(token), (legacyRow as any).sessionId);
        } catch {
            // Upgrade is best-effort; the session remains valid either way
        }
        return rowToSession(legacyRow);
    }
    return undefined;
}

export async function deleteSession(token: string) {
    const statement = db.prepare(`DELETE FROM sessions WHERE token = ? OR token = ?`);
    await statement.run(token, hashToken(token));
}

/** Revoke every session belonging to a user (e.g. after a password change). */
export async function deleteSessionsForUser(userId: number, exceptHashedToken?: string) {
    const statement = exceptHashedToken
        ? db.prepare(`DELETE FROM sessions WHERE userId = ? AND token != ?`)
        : db.prepare(`DELETE FROM sessions WHERE userId = ?`);
    if (exceptHashedToken) {
        await statement.run(userId, exceptHashedToken);
    } else {
        await statement.run(userId);
    }
}
