import { Database } from 'bun:sqlite';
import { initializeUserTable } from '../functionalities/user/db';
import { initializeNoteTable } from '../functionalities/note/db';
import { initializeConfigTable } from '../functionalities/config/db';
import { initializeLogTable } from '../functionalities/log/db';
import { initializeSessionTable } from '../functionalities/session/db';
import { AppParams } from './app_params';
import { initializeTagTable } from '../functionalities/tag/db';
import { initializeNoteTagTable } from '../functionalities/note/tag/db';
import { initializeSignatureComponentTable } from '../functionalities/signature/component/db';
import { initializeSignatureElementTable, initializeSignatureElementParentTable } from '../functionalities/signature/element/db';
import { initializeArchiveDocumentTable, initializeArchiveDocumentTagTable } from '../functionalities/archive/document/db';

export const db = new Database(AppParams.dbPath);

export async function initializeDatabase() {
    db.exec('PRAGMA foreign_keys = ON;');
    await initializeLogTable();
    await initializeConfigTable();
    await initializeUserTable();
    await initializeSessionTable();


    // Tags
    await initializeTagTable(); // Tags first

    // Archive Documents & Tags
    await initializeArchiveDocumentTable();
    await initializeArchiveDocumentTagTable(); // Junction table depends on documents and tags


    // Notes & Tags
    await initializeNoteTable();
    await initializeNoteTagTable();

    // Signature
    await initializeSignatureComponentTable(); // Components first
    await initializeSignatureElementTable();     // Elements depend on components
    await initializeSignatureElementParentTable(); // Element relationships depend on elements

    // Log successful initialization
    console.log("Database tables initialized successfully."); // Added log
    return db;
}