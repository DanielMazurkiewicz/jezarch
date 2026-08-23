import { db } from '../../initialization/db';
import { Log } from '../log/db';
// Correctly import the EXPORTED defaultLanguage along with other types
import { User, UserRole, SupportedLanguage, supportedLanguages, defaultLanguage } from './models';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { Tag } from '../tag/models'; // Import Tag model for return type

// initialization function
export async function initializeUserTable() {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        userId INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT NULL CHECK(role IS NULL OR role IN ('admin', 'employee', 'user')),
        preferredLanguage TEXT DEFAULT '${defaultLanguage}' NOT NULL CHECK(preferredLanguage IN ('${supportedLanguages.join("','")}')) -- Added column with default
    )
    `);

    const admin = await getUserByLogin('admin');
    if (!admin) {
        // Create the initial admin account. A well-known default password would
        // leave deployments wide open, so a strong secret is generated unless one
        // is supplied explicitly via JEZARCH_INITIAL_ADMIN_PASSWORD.
        const initialPassword = process.env.JEZARCH_INITIAL_ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
        await createUser('admin', initialPassword, 'admin', defaultLanguage);
        if (process.env.JEZARCH_INITIAL_ADMIN_PASSWORD) {
            await Log.info(`Initial admin user created using JEZARCH_INITIAL_ADMIN_PASSWORD`, 'system', 'database', { action: 'initialization' });
        } else {
            console.log('======================================================================');
            console.log('  Initial admin account created.');
            console.log(`  login:    admin`);
            console.log(`  password: ${initialPassword}`);
            console.log('  Store it now — it is not shown again.');
            console.log('======================================================================');
            await Log.info(`Initial admin user created with a generated password`, 'system', 'database', { action: 'initialization' });
        }
    }
}

export async function initializeUserAllowedTagTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user_allowed_tags (
            userId INTEGER NOT NULL,
            tagId INTEGER NOT NULL,
            PRIMARY KEY (userId, tagId),
            FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
            FOREIGN KEY (tagId) REFERENCES tags(tagId) ON DELETE CASCADE
        )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_uat_user ON user_allowed_tags (userId);`);
}

export async function createUser(
    login: string,
    password: string,
    role: UserRole | null = null,
    preferredLanguage: SupportedLanguage = defaultLanguage // Use imported default from model
) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
    const finalRole = validRoles.includes(role) ? role : null;
    const finalLanguage = supportedLanguages.includes(preferredLanguage) ? preferredLanguage : defaultLanguage; // Fallback to default

    const statement = db.prepare(`INSERT INTO users (login, password, role, preferredLanguage) VALUES (?, ?, ?, ?)`);
    try {
        statement.run(login, hashedPassword, finalRole, finalLanguage);
    } catch (error: any) {
        await Log.error('Failed to insert user', 'system', 'database', { login, role: finalRole, preferredLanguage: finalLanguage, error });
            if (error.message?.includes('UNIQUE constraint failed')) throw new Error(`User with login '${login}' already exists.`);
            else if (error.message?.includes('CHECK constraint failed')) {
                if (!validRoles.includes(finalRole)) throw new Error(`Invalid role specified: ${finalRole}`);
                if (!supportedLanguages.includes(finalLanguage)) throw new Error(`Invalid preferred language specified: ${finalLanguage}`);
                throw error; // Other CHECK constraint
            }
            else throw error;
    }
}

// Helper to fetch assigned tags for a list of user IDs
async function getAssignedTagsForUserIds(userIds: number[]): Promise<Map<number, Tag[]>> {
    const tagsMap = new Map<number, Tag[]>();
    if (userIds.length === 0) return tagsMap;

    const placeholders = userIds.map(() => '?').join(',');
    const statement = db.prepare(`
        SELECT uat.userId, t.*
        FROM tags t
        JOIN user_allowed_tags uat ON t.tagId = uat.tagId
        WHERE uat.userId IN (${placeholders})
        ORDER BY uat.userId, t.name COLLATE NOCASE
    `);

    try {
        const rows = statement.all(...userIds) as ({ userId: number } & Tag)[];
        rows.forEach(row => {
            const { userId, ...tagData } = row;
            if (!tagsMap.has(userId)) {
                tagsMap.set(userId, []);
            }
            tagsMap.get(userId)!.push(tagData);
        });
    } catch (error) {
        await Log.error('Failed to bulk fetch assigned tags for users', 'system', 'database', { error });
    }
    return tagsMap;
}


// Map DB row to User object, optionally including password
const mapDbRowToUser = (row: any, includePassword = false): (User | Omit<User, 'password' | 'assignedTags'>) | undefined => {
    if (!row) return undefined;
    const base = {
        userId: row.userId,
        login: row.login,
        role: row.role as UserRole | null,
        preferredLanguage: row.preferredLanguage as SupportedLanguage || defaultLanguage,
    };
    if (includePassword) {
        return { ...base, password: row.password } as User;
    }
    return base;
}

export async function getUserByUserId(userId: number): Promise<User | undefined> {
    const statement = db.prepare(`SELECT userId, login, role, preferredLanguage FROM users WHERE userId = ?`);
    const row = statement.get(userId);
    const userBase = mapDbRowToUser(row);
    if (!userBase) return undefined;

    // Fetch tags if user role is 'user'
    let assignedTags: Tag[] | undefined = undefined;
    if (userBase.role === 'user') {
        assignedTags = await getAssignedTagsForUser(userBase.userId);
    }
    return { ...userBase, assignedTags };
}

export async function getUserByLogin(login: string): Promise<User | undefined> {
    // Fetches password hash, needed for verification
    const statement = db.prepare(`SELECT * FROM users WHERE login = ?`);
    const row = statement.get(login);
    const userWithPassword = mapDbRowToUser(row, true) as User | undefined;
    if (!userWithPassword) return undefined;

    // Fetch tags if user role is 'user'
    let assignedTags: Tag[] | undefined = undefined;
    if (userWithPassword.role === 'user') {
        assignedTags = await getAssignedTagsForUser(userWithPassword.userId);
    }
    return { ...userWithPassword, assignedTags };
}

// Fetches user details *without* the password hash, but *with* assigned tags if applicable
export async function getUserByLoginSafe(login: string): Promise<Omit<User, 'password'> | undefined> {
    const statement = db.prepare(`SELECT userId, login, role, preferredLanguage FROM users WHERE login = ?`);
    const row = statement.get(login);
    const userBase = mapDbRowToUser(row);
    if (!userBase) return undefined;

    // Fetch tags if user role is 'user'
    let assignedTags: Tag[] | undefined = undefined;
    if (userBase.role === 'user') {
        assignedTags = await getAssignedTagsForUser(userBase.userId);
    }
    return { ...userBase, assignedTags };
}


export async function updateUserRole(login: string, role: UserRole | null) {
    const validRoles: (UserRole | null)[] = ['admin', 'employee', 'user', null];
    if (!validRoles.includes(role)) throw new Error(`Invalid role specified: ${role}`);

    const statement = db.prepare(`UPDATE users SET role = ? WHERE login = ?`);
    try {
        const result = statement.run(role, login);
        if (result.changes === 0) throw new Error(`User '${login}' not found for role update.`);
    } catch (error: any) {
        await Log.error('Failed to update user role', 'system', 'database', { login, role, error });
        if (error.message?.includes('CHECK constraint failed')) throw new Error(`Invalid role specified: ${role}`);
        else throw error;
    }
}

/** Number of admin accounts excluding the given login (for last-admin protection). */
export async function countAdminsExcluding(excludedLogin?: string): Promise<number> {
    const statement = excludedLogin
        ? db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND login != ?`)
        : db.prepare(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`);
    const row = excludedLogin ? statement.get(excludedLogin) as { count: number } : statement.get() as { count: number };
    return row?.count ?? 0;
}

// --- NEW: Update user's preferred language ---
export async function updateUserPreferredLanguage(login: string, language: SupportedLanguage) {
    if (!supportedLanguages.includes(language)) {
        throw new Error(`Invalid preferred language specified: ${language}. Supported: ${supportedLanguages.join(', ')}`);
    }
    // Ensure language update actually modifies the record
    const statement = db.prepare(`UPDATE users SET preferredLanguage = ? WHERE login = ?`);
    try {
        const result = statement.run(language, login);
        if (result.changes === 0) {
                // Check if user exists but language was already set
                const userExists = db.query<{ count: number }, any[]>(`SELECT COUNT(*) as count FROM users WHERE login = ?`).get(login);
                if (userExists && userExists.count > 0) {
                    // Don't throw error if user exists but language is the same
                } else {
                    throw new Error(`User '${login}' not found for preferred language update.`);
                }
        }
    } catch (error: any) {
        await Log.error('Failed to update user preferred language', 'system', 'database', { login, language, error });
        if (error.message?.includes('CHECK constraint failed')) throw new Error(`Invalid preferred language specified: ${language}`);
        else throw error;
    }
}
// --- END NEW ---


export async function updateUserPassword(login: string, newPassword: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const statement = db.prepare(`UPDATE users SET password = ? WHERE login = ?`);
    try {
        const result = statement.run(hashedPassword, login);
        if (result.changes === 0) throw new Error(`User '${login}' not found for password update.`);
    } catch (error: any) {
        await Log.error('Failed to update user password', 'system', 'database', { login, error });
        throw error;
    }
}

export async function adminSetUserPassword(login: string, newPassword: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const statement = db.prepare(`UPDATE users SET password = ? WHERE login = ?`);
    try {
        const result = statement.run(hashedPassword, login);
        if (result.changes === 0) throw new Error(`User '${login}' not found for admin password set.`);
    } catch (error: any) {
        await Log.error('Failed during admin password set', 'system', 'database', { login, error });
        throw error;
    }
}

// Updated getAllUsers to fetch and include assigned tags for 'user' roles
export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
    const statement = db.prepare(`SELECT userId, login, role, preferredLanguage FROM users`);
    const rows = statement.all();

    const userBases = rows.map((row: any) => mapDbRowToUser(row)).filter((u): u is Omit<User, 'password' | 'assignedTags'> => u !== undefined);
    const userRoleUserIds = userBases.filter(u => u.role === 'user').map(u => u.userId);

    // Fetch tags only for users with the 'user' role
    const tagsMap = await getAssignedTagsForUserIds(userRoleUserIds);

    // Combine base user info with fetched tags
    return userBases.map(userBase => ({
        ...userBase,
        assignedTags: tagsMap.get(userBase.userId) || (userBase.role === 'user' ? [] : undefined), // Provide empty array for 'user' role if no tags found, undefined otherwise
    }));
}

// Constant dummy hash so that logins for non-existent users pay the same
// bcrypt cost as real ones (prevents username enumeration via timing).
const TIMING_DUMMY_HASH = '$2a$10$PwD4xeEnzIO.ccmuC2s7/e3qXTGqLiTQgRQ3yxsOCwM5phkaXj5Ke';

export async function verifyPassword(login: string, password: string): Promise<boolean> {
    const statement = db.prepare(`SELECT password FROM users WHERE login = ?`);
    const row = statement.get(login) as { password?: string } | undefined;
    if (!row || !row.password) {
        // User not found: burn comparable CPU time before failing
        try { await bcrypt.compare(password, TIMING_DUMMY_HASH); } catch { }
        return false;
    }

    try {
        return await bcrypt.compare(password, row.password);
    } catch (compareError) {
            await Log.error('Password comparison failed', login, 'auth', compareError);
            return false;
    }
}

// --- User Allowed Tags ---

export async function assignTagsToUser(userId: number, tagIds: number[]): Promise<void> {
    const transaction = db.transaction(() => {
        const userCheckStmt = db.prepare(`SELECT role FROM users WHERE userId = ?`);
        const user = userCheckStmt.get(userId) as { role: UserRole | null } | undefined;
        if (!user) {
                Log.warn(`Attempted to assign tags to non-existent user ${userId}`, 'system', 'database');
                throw new Error(`User with ID ${userId} not found.`);
        }
        if (user?.role !== 'user') {
            Log.warn(`Attempted to assign tags to non-'user' role`, 'system', 'database', { userId, role: user?.role });
            throw new Error(`Cannot assign tags to user ${userId} with role ${user?.role}.`); // Throw error now
        }

        const deleteStmt = db.prepare(`DELETE FROM user_allowed_tags WHERE userId = ?`);
        deleteStmt.run(userId);

        if (!tagIds || tagIds.length === 0) return;

        const insertStmt = db.prepare(`
            INSERT OR IGNORE INTO user_allowed_tags (userId, tagId)
            SELECT ?, ?
            WHERE EXISTS (SELECT 1 FROM tags WHERE tagId = ?)
        `);
        for (const tagId of tagIds) {
            if (typeof tagId === 'number' && Number.isInteger(tagId) && tagId > 0) {
                insertStmt.run(userId, tagId, tagId);
            } else {
                Log.warn(`Skipping invalid tagId ${tagId} during assignment to user ${userId}`, 'system', 'database');
            }
        }
    });

    try {
        transaction();
    } catch (error) {
        await Log.error(`Failed to assign tags to user ${userId}`, 'system', 'database', { tagIds, error });
        throw error;
    }
}

export async function getAssignedTagsForUser(userId: number): Promise<Tag[]> {
    try {
        const statement = db.prepare(`
            SELECT t.* FROM tags t
            JOIN user_allowed_tags uat ON t.tagId = uat.tagId
            WHERE uat.userId = ?
            ORDER BY t.name COLLATE NOCASE
        `);
        return statement.all(userId) as Tag[];
    } catch (error) {
        await Log.error(`Failed to get assigned tags for user ${userId}`, 'system', 'database', error);
        throw error;
    }
}

export async function getAssignedTagIdsForUser(userId: number): Promise<number[]> {
    try {
        const statement = db.prepare(`SELECT tagId FROM user_allowed_tags WHERE userId = ?`);
        const results = statement.all(userId) as { tagId: number }[];
        return results.map(r => r.tagId);
    } catch (error) {
        await Log.error(`Failed to get assigned tag IDs for user ${userId}`, 'system', 'database', error);
        throw error;
    }
}