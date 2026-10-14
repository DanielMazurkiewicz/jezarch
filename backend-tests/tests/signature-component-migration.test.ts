import '../setup'; // must be imported first: configures AppParams before backend modules load
import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer } from '../setup';
import { db } from '../../backend/src/initialization/db';
import { initializeSignatureComponentTable } from '../../backend/src/functionalities/signature/component/db';

// Legacy pre-component-type schema: `name` carried a global UNIQUE constraint,
// which SQLite refuses to drop and therefore requires a table rebuild.
const legacyDDL = `
    CREATE TABLE signature_components (
        signatureComponentId INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        index_count INTEGER NOT NULL DEFAULT 0,
        index_type TEXT NOT NULL DEFAULT 'dec' CHECK(index_type IN ('dec', 'roman', 'small_char', 'capital_char')),
        createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`;

let legacyComponentId: number;
let legacyElementId: number;

beforeAll(async () => {
    await startTestServer(); // initializes all tables with the modern schema

    // Rebuild the table with the legacy schema inside the shared test DB.
    // Safe within suite ordering: this file runs right after signature-components.test.ts,
    // whose assertions have already completed, and everything is cleaned up below.
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DROP TABLE IF EXISTS signature_element_parents;');
    db.exec('DROP TABLE IF EXISTS signature_elements;');
    db.exec('DROP TABLE IF EXISTS signature_components;');
    db.exec(legacyDDL);
    db.exec(`
        CREATE TABLE signature_elements (
            signatureElementId INTEGER PRIMARY KEY AUTOINCREMENT,
            signatureComponentId INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            "index" TEXT,
            createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (signatureComponentId) REFERENCES signature_components(signatureComponentId) ON DELETE CASCADE
        )
    `);
    db.exec('PRAGMA foreign_keys = ON;');

    const componentInsert = db.query(`
        INSERT INTO signature_components (name, description, index_count, index_type, createdOn, modifiedOn)
        VALUES ('Legacy Series', 'kept across the rebuild', 3, 'roman', '2024-01-01 10:00:00', '2024-01-02 11:00:00')
    `).run();
    legacyComponentId = Number(componentInsert.lastInsertRowid);
    const elementInsert = db.query(
        'INSERT INTO signature_elements (signatureComponentId, name, "index") VALUES (?, ?, ?)'
    ).run(legacyComponentId, 'Legacy Element', 'I');
    legacyElementId = Number(elementInsert.lastInsertRowid);

    await initializeSignatureComponentTable(); // triggers migrateComponentNameUniqueness()
});

afterAll(() => {
    // Leave the shared DB pristine for later test files.
    try { db.query('DELETE FROM signature_elements WHERE signatureElementId = ?').run(legacyElementId); } catch { }
    try { db.query('DELETE FROM signature_components WHERE signatureComponentId = ?').run(legacyComponentId); } catch { }
});

test('migration removes the global UNIQUE constraint and keeps the rows', () => {
    const indexes = db.query<{ origin: string }, any[]>('PRAGMA index_list(signature_components)').all();
    expect(indexes.some(index => index.origin === 'u')).toBe(false);

    const migrated = db.query('SELECT * FROM signature_components WHERE signatureComponentId = ?').get(legacyComponentId) as any;
    expect(migrated?.name).toBe('Legacy Series');
    expect(migrated?.description).toBe('kept across the rebuild');
    expect(migrated?.index_count).toBe(3);
    expect(migrated?.index_type).toBe('roman');
    expect(migrated?.is_main).toBe(0);
    expect(migrated?.type).toBe('FLAT');
    expect(migrated?.element_id).toBe(null);
    expect(String(migrated?.createdOn)).toContain('2024-01-01');

    const migratedTableGone = db.query(
        "SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table' AND name='signature_components_migrated'"
    ).get() as { total: number };
    expect(migratedTableGone.total).toBe(0);
});

test('migration preserves elements referencing the rebuilt table', () => {
    const element = db.query('SELECT * FROM signature_elements WHERE signatureElementId = ?').get(legacyElementId) as any;
    expect(element?.signatureComponentId).toBe(legacyComponentId);
    expect(element?.name).toBe('Legacy Element');
    expect((db.query('PRAGMA foreign_keys;').get() as any)?.foreign_keys).toBe(1);
});

test('partial uniqueness allows duplicate names for ELEMENT components only', () => {
    const insertComponent = db.query('INSERT INTO signature_components (name, type) VALUES (?, ?)');

    const flat = insertComponent.run('Shared Name', 'FLAT');
    try {
        // Regular components keep their unique name...
        expect(() => insertComponent.run('Shared Name', 'FLAT')).toThrow();
        // ...while ELEMENT mirrors, which are internal, may share it.
        const elementMirror = insertComponent.run('Shared Name', 'ELEMENT');
        expect(Number(elementMirror.lastInsertRowid)).toBeGreaterThan(0);
        db.query('DELETE FROM signature_components WHERE signatureComponentId = ?').run(Number(elementMirror.lastInsertRowid));
    } finally {
        db.query('DELETE FROM signature_components WHERE signatureComponentId = ?').run(Number(flat.lastInsertRowid));
    }
});

test('repeated initialization is a no-op', async () => {
    await initializeSignatureComponentTable();
    const migrated = db.query('SELECT name FROM signature_components WHERE signatureComponentId = ?').get(legacyComponentId) as any;
    expect(migrated?.name).toBe('Legacy Series');
});