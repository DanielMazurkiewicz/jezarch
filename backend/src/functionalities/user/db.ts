import { db } from '../../initialization/db';
import { Log } from '../log/db';
import { User } from './models';
import * as bcrypt from 'bcryptjs';


// initialization function
export async function initializeUserTable() {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'regular_user'
    )
  `);

    // Check if admin user exists
    const admin = await getUserByLogin('admin');

    if (!admin) {
        // Create default admin user
        await createUser('admin', 'admin', 'admin');
        await Log.info(
            'Default admin user created',
            'system',
            'database',
            { action: 'initialization' }
        );
    }
}

export async function createUser(login: string, password: string, role: 'admin' | 'regular_user' | null = null) {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const statement = db.prepare(`INSERT INTO users (login, password, role) VALUES (?, ?, ?)`);
    statement.run(login, hashedPassword, role);
}

export async function getUserByUserId(userId: number): Promise<User | undefined> {
    const statement = db.prepare(`SELECT * FROM users WHERE userId = ?`);
    const row = statement.get(userId);
    return row as User;
}

export async function getUserByLogin(login: string): Promise<User | undefined> {
    const statement = db.prepare(`SELECT * FROM users WHERE login = ?`);
    const row = statement.get(login);
    return row as User;
}

export async function updateUserRole(login: string, role: 'admin' | 'regular_user') {
    const statement = db.prepare(`UPDATE users SET role = ? WHERE login = ?`);
    statement.run(role, login);
}

export async function updateUserPassword(login: string, newPassword: string) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const statement = db.prepare(`UPDATE users SET password = ? WHERE login = ?`);
    statement.run(hashedPassword, login);
}

export async function getAllUsers(): Promise<User[]> {
    const statement = db.prepare(`SELECT * FROM users`);
    return statement.all() as User[];
}

export async function verifyPassword(login: string, password: string): Promise<boolean> {
    const user = await getUserByLogin(login);
    if (!user || !user.password) return false;

    return await bcrypt.compare(password, user.password);
}