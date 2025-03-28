import { db } from '../../initialization/db';
import type { Note } from './models';

// initialization function
export async function initializeNoteTable() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            noteId INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            shared BOOLEAN NOT NULL DEFAULT FALSE,
            ownerUserId INTEGER NOT NULL,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ownerUserId) REFERENCES users(userId)
        )
    `);
}

const dbToNote = (data: any) => {
    if (data) {
        return {
            ...data,
            createdOn: new Date(data.createdOn),
            modifiedOn: new Date(data.modifiedOn)
        } as Note;
    }
    return undefined;
} 


// operation functions
export async function createNote(
    title: string, 
    content: string, 
    ownerUserId: number, 
    shared: boolean = false
  ): Promise<number> {
    const statement = db.prepare(
      `INSERT INTO notes (title, content, ownerUserId, shared) 
       VALUES (?, ?, ?, ?)
       RETURNING noteId`
    );
    
    const result = statement.get(title, content, ownerUserId, shared) as { noteId: number };
    return result.noteId;
  }

export async function getNoteById(noteId: number): Promise<Note | undefined> {
    const statement = db.prepare(`SELECT * FROM notes WHERE noteId = ?`);
    const row = statement.get(noteId) as Note;
    return dbToNote(row);
}

export async function getAllNotesByOwnerUserId(ownerUserId: number): Promise<Note[]> {
    const statement = db.prepare(`SELECT * FROM notes WHERE ownerUserId = ?`);
    return statement.all(ownerUserId).map(dbToNote) as Note[];
}

export async function updateNote(noteId: number, title?: string, content?: string, shared?: boolean) {
    let query = `UPDATE notes SET `;
    const params: any[] = [];

    if (title !== undefined) {
        query += `title = ?, `;
        params.push(title);
    }
    if (content !== undefined) {
        query += `content = ?, `;
        params.push(content);
    }
    if (shared !== undefined) {
        query += `shared = ?, `;
        params.push(shared);
    }
    query += `modifiedOn = CURRENT_TIMESTAMP, `
    
    query = query.slice(0, -2) + ` WHERE noteId = ?`; // Remove trailing comma and space
    params.push(noteId);

    const statement = db.prepare(query);
    await statement.run(...params);
}

export async function deleteNote(noteId: number) {
    const statement = db.prepare(`DELETE FROM notes WHERE noteId = ?`);
    statement.run(noteId);
}
