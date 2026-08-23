import '../setup'; // must be imported first: configures AppParams before backend modules load
import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer } from '../setup';
import { db } from '../../backend/src/initialization/db';
import { initializeArchiveDocumentTable, initializeArchiveDocumentTagTable } from '../../backend/src/functionalities/archive/document/db';

// Legacy pre-isDeleted schema (values flipped: active=TRUE meant visible)
const legacyDDL = `
    CREATE TABLE archive_documents (
        archiveDocumentId INTEGER PRIMARY KEY AUTOINCREMENT,
        parentUnitArchiveDocumentId INTEGER,
        createdBy TEXT NOT NULL,
        updatedBy TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('unit', 'document')),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        topographicSignature TEXT,
        descriptiveSignatureElementIds TEXT NOT NULL DEFAULT '[]',
        title TEXT NOT NULL,
        creator TEXT NOT NULL,
        creationDate TEXT NOT NULL,
        numberOfPages TEXT,
        documentType TEXT,
        dimensions TEXT,
        binding TEXT,
        condition TEXT,
        documentLanguage TEXT,
        contentDescription TEXT,
        remarks TEXT,
        accessLevel TEXT,
        accessConditions TEXT,
        additionalInformation TEXT,
        relatedDocumentsReferences TEXT,
        recordChangeHistory TEXT,
        isDigitized BOOLEAN NOT NULL DEFAULT FALSE,
        digitizedVersionLink TEXT,
        createdOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modifiedOn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`;

let testTagId: number;

beforeAll(async () => {
  await startTestServer(); // initializes all tables with the modern schema

  // Rebuild the table with the legacy schema inside the shared test DB.
  // Safe within suite ordering: this file runs right after archive-documents.test.ts,
  // whose assertions have already completed, and everything is cleaned up below.
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS archive_document_tags;');
  db.exec('DROP TABLE IF EXISTS archive_documents;');
  db.exec(legacyDDL);
  db.exec(`
      CREATE TABLE archive_document_tags (
          archiveDocumentId INTEGER NOT NULL,
          tagId INTEGER NOT NULL,
          PRIMARY KEY (archiveDocumentId, tagId),
          FOREIGN KEY (archiveDocumentId) REFERENCES archive_documents(archiveDocumentId) ON DELETE CASCADE,
          FOREIGN KEY (tagId) REFERENCES tags(tagId) ON DELETE CASCADE
      )
  `);
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
      INSERT INTO archive_documents (archiveDocumentId, createdBy, updatedBy, type, active, title, creator, creationDate)
      VALUES (1, 'tester', 'tester', 'unit', 1, 'Legacy Unit', 'Creator A', '2024-01-01'),
             (2, 'tester', 'tester', 'document', 0, 'Legacy Deleted Doc', 'Creator B', '2024-01-02')
  `);
  const tagInsert = db.query("INSERT INTO tags (name, description) VALUES ('migration-test-tag', 'tag created by migration test')").run();
  testTagId = Number(tagInsert.lastInsertRowid);
  db.query('INSERT INTO archive_document_tags (archiveDocumentId, tagId) VALUES (1, ?), (2, ?)').run(testTagId, testTagId);

  await initializeArchiveDocumentTagTable();
  await initializeArchiveDocumentTable(); // triggers migrateActiveToIsDeleted()
});

afterAll(() => {
  // Leave the shared DB pristine for later test files.
  try { db.query('DELETE FROM archive_document_tags WHERE tagId = ?').run(testTagId); } catch { }
  try { db.query("DELETE FROM tags WHERE name = 'migration-test-tag'").run(); } catch { }
  try { db.exec("DELETE FROM archive_documents WHERE createdBy = 'tester';"); } catch { }
  try { db.exec("DELETE FROM sqlite_sequence WHERE name = 'archive_documents';"); } catch { }
});

test('migrateActiveToIsDeleted preserves document<->tag associations', () => {
  const junctionCount = db.query('SELECT COUNT(*) as total FROM archive_document_tags WHERE tagId = ?').get(testTagId) as { total: number };
  expect(junctionCount.total).toBe(2);

  const doc1 = db.query('SELECT isDeleted FROM archive_documents WHERE archiveDocumentId = 1').get() as any;
  expect(doc1?.isDeleted).toBe(0); // active=TRUE flipped to isDeleted=false

  const doc2 = db.query('SELECT isDeleted FROM archive_documents WHERE archiveDocumentId = 2').get() as any;
  expect(doc2?.isDeleted).toBe(1); // active=FALSE flipped to isDeleted=true

  const migratedTableGone = db.query(
    "SELECT COUNT(*) as total FROM sqlite_master WHERE type='table' AND name='archive_documents_migrated'"
  ).get() as { total: number };
  expect(migratedTableGone.total).toBe(0);
});
