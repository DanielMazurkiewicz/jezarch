import { Database } from 'bun:sqlite';
import { initializeUserTable } from '../functionalities/user/db';
import { initializeNoteTable } from '../functionalities/note/db';
import { initializeConfigTable } from '../functionalities/config/db';
import { initializeLogTable } from '../functionalities/log/db';
import { initializeSessionTable } from '../functionalities/session/db';
import { AppParams } from './app_params';
import { initializeTagTable } from '../functionalities/tag/db';
import { initializeNoteTagTable } from '../functionalities/note/tag/db';

export const db = new Database(AppParams.dbPath);

export async function initializeDatabase() {
    db.exec('PRAGMA foreign_keys = ON;'); 
    await initializeLogTable();
    await initializeConfigTable();
    await initializeUserTable();
    await initializeSessionTable();

    await initializeNoteTable();
    await initializeNoteTagTable();
    await initializeTagTable();
    return db
}

