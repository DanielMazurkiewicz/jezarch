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

async function tryInitialize(tableName: string, initFn: () => Promise<any>) {
    try {
        await initFn();
        console.log(`  - Initialized table: ${tableName}`);
    } catch (error) {
        console.error(`*** FAILED to initialize table: ${tableName} ***`);
        console.error(error);
        // Decide if you want to re-throw or exit, for now just log
        // throw error; // Optional: Uncomment to halt execution on failure
    }
}


export async function initializeDatabase() {
    console.log("* initializeDatabase - Setting PRAGMAs and initializing tables...");
    try {
        db.exec('PRAGMA foreign_keys = ON;');
        console.log("  - PRAGMA foreign_keys = ON; set successfully.");
    } catch (error) {
         console.error("*** FAILED to set PRAGMA foreign_keys ***");
         console.error(error);
         // Probably exit if this fails
         process.exit(1);
    }

    // Initialize core tables first, order matters for dependencies/logging
    await tryInitialize('logs', initializeLogTable);
    await tryInitialize('config', initializeConfigTable);
    await tryInitialize('users', initializeUserTable); // Depends on logs potentially for default user creation log
    await tryInitialize('sessions', initializeSessionTable); // Depends on users

    // Feature-specific tables
    await tryInitialize('tags', initializeTagTable); // Tags need to exist before junction tables

    // Archive Documents & Tags
    await tryInitialize('archive_documents', initializeArchiveDocumentTable); // Depends on users
    await tryInitialize('archive_document_tags', initializeArchiveDocumentTagTable); // Depends on archive_documents, tags

    // Notes & Tags
    await tryInitialize('notes', initializeNoteTable); // Depends on users
    await tryInitialize('note_tags', initializeNoteTagTable); // Depends on notes, tags

    // Signature Components & Elements
    await tryInitialize('signature_components', initializeSignatureComponentTable);
    await tryInitialize('signature_elements', initializeSignatureElementTable); // Depends on signature_components
    await tryInitialize('signature_element_parents', initializeSignatureElementParentTable); // Depends on signature_elements

    return db;
}