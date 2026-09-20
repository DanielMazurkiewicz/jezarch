import { beforeAll, afterAll, describe, test, expect } from 'bun:test';
import { startTestServer, stopTestServer } from '../setup';

/**
 * Unit tests for archiveDocumentSignatureSearchHandler — the SQL builder behind
 * the "Sygn. Opisowa" (descriptive signature) filter.
 *
 * The handler is exercised against a fixture table whose element IDs are
 * chosen by hand, so ID-prefix collisions (e.g. 2 vs 23, 1 vs 12) are covered
 * deterministically — something auto-incremented IDs in the API-level suite
 * cannot guarantee.
 *
 * Storage format under test: descriptiveSignatureElementIds is a JSON array of
 * paths, each path an array of element IDs (e.g. [[1,2],[3]]).
 */

let archiveDocumentSignatureSearchHandler: (
    element: import('../../backend/src/utils/search').SearchQueryElement,
    tableAlias: string
) => { whereCondition: string; joinClause?: string; params: any[] } | null;

let db: import('bun:sqlite').Database;

const TABLE = 'sig_handler_test_docs';
const ALIAS = 'sig_test_main';

// Fixture rows: docId -> stored JSON
const FIXTURES: [number, string][] = [
    [1, '[[1,2]]'],      // single path [1,2]
    [2, '[[1,23]]'],     // tricky: 23 begins with "2"
    [3, '[[23,1]]'],     // 23 first, then 1
    [4, '[[1]]'],        // single element
    [5, '[[2]]'],        // single element 2
    [6, '[]'],           // no signature at all
    [7, '[[1,2,3]]'],    // longer path starting with [1,2]
    [8, '[[3,1,2]]'],    // sequence [1,2] as suffix
    [9, '[[1],[23]]'],   // document with two paths
];

type Element = { field: string; condition: string; value: unknown; not?: boolean };

function makeElement(condition: string, value: unknown, not = false): Element {
    return { field: 'descriptiveSignature', condition, value, not };
}

async function searchFixture(element: Element): Promise<number[]> {
    const result = archiveDocumentSignatureSearchHandler(
        element as import('../../backend/src/utils/search').SearchQueryElement,
        ALIAS,
    );
    if (!result) return []; // handler declined to build a condition
    const stmt = db.prepare(`SELECT docId FROM ${TABLE} AS ${ALIAS} WHERE ${result.whereCondition}`);
    const rows = stmt.all(...result.params) as { docId: number }[];
    return rows.map(r => r.docId).sort((a, b) => a - b);
}

beforeAll(async () => {
    // Start the shared test server first: it points AppParams.dbPath at a temp
    // file and initializes all modules before any of them open the database.
    await startTestServer();
    ({ archiveDocumentSignatureSearchHandler } = await import('../../backend/src/functionalities/archive/document/db'));
    ({ db } = await import('../../backend/src/initialization/db'));

    db.exec(`DROP TABLE IF EXISTS ${TABLE}`);
    db.exec(`CREATE TABLE ${TABLE} (docId INTEGER PRIMARY KEY, descriptiveSignatureElementIds TEXT NOT NULL DEFAULT '[]')`);
    const insert = db.prepare(`INSERT INTO ${TABLE} (docId, descriptiveSignatureElementIds) VALUES (?, ?)`);
    for (const [docId, json] of FIXTURES) insert.run(docId, json);
});

afterAll(async () => {
    try { db.exec(`DROP TABLE IF EXISTS ${TABLE}`); } catch { /* already dropped or no connection */ }
    await stopTestServer();
});

describe('Signature handler: EQ (exact path match)', () => {
    test('EQ [1,2] matches only the document whose exact path is [1,2]', async () => {
        expect(await searchFixture(makeElement('EQ', [1, 2]))).toEqual([1]);
    });

    test('EQ [1,23] matches only doc 2 — not doc 1 ([1,2]) nor doc 9 (paths [1],[23])', async () => {
        expect(await searchFixture(makeElement('EQ', [1, 23]))).toEqual([2]);
    });

    test('EQ [] matches only the document without any signature', async () => {
        expect(await searchFixture(makeElement('EQ', []))).toEqual([6]);
    });

    test('EQ [] with not:true matches every document that has at least one path', async () => {
        expect(await searchFixture(makeElement('EQ', [], true))).toEqual([1, 2, 3, 4, 5, 7, 8, 9]);
    });

    test('EQ [1,2] with not:true excludes doc 1 but keeps all others (incl. no-signature docs)', async () => {
        expect(await searchFixture(makeElement('EQ', [1, 2], true))).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    });
});

describe('Signature handler: STARTS_WITH (path prefix)', () => {
    test('STARTS_WITH [1] matches all paths whose first element is 1', async () => {
        // docs 1 ([1,2]), 2 ([1,23]), 4 ([1]), 7 ([1,2,3]), 9 (path [1])
        expect(await searchFixture(makeElement('STARTS_WITH', [1]))).toEqual([1, 2, 4, 7, 9]);
    });

    test('STARTS_WITH [1] must not match paths where 1 appears later or as part of another ID', async () => {
        const ids = await searchFixture(makeElement('STARTS_WITH', [1]));
        for (const excluded of [3, 5, 6, 8]) expect(ids).not.toContain(excluded);
    });

    test('STARTS_WITH [1] with not:true returns the complement (incl. no-signature docs)', async () => {
        expect(await searchFixture(makeElement('STARTS_WITH', [1], true))).toEqual([3, 5, 6, 8]);
    });

    test('STARTS_WITH [1,2] matches exact path and longer paths — but NOT [1,23]', async () => {
        // doc 1 ([1,2] exact) and doc 7 ([1,2,3]) match; doc 2 ([1,23]) must not:
        // 23 is a different element whose ID merely starts with "2".
        expect(await searchFixture(makeElement('STARTS_WITH', [1, 2]))).toEqual([1, 7]);
    });

    test('STARTS_WITH [23] matches only paths beginning with element 23', async () => {
        // doc 3 ([23,1]) and doc 9 (path [23]); doc 2 ([1,23]) starts with 1, not 23.
        expect(await searchFixture(makeElement('STARTS_WITH', [23]))).toEqual([3, 9]);
    });
});

describe('Signature handler: CONTAINS_SEQUENCE (sequence anywhere)', () => {
    test('CONTAINS_SEQUENCE [1,2] matches exact, prefix and suffix occurrences — but NOT [1,23]', async () => {
        // doc 1 ([1,2] exact), doc 7 ([1,2,3] prefix), doc 8 ([3,1,2] suffix).
        // doc 2 ([1,23]) must not match: the sequence ends at element 2, and
        // element 23 is a distinct ID that merely starts with "2".
        expect(await searchFixture(makeElement('CONTAINS_SEQUENCE', [1, 2]))).toEqual([1, 7, 8]);
    });

    test('CONTAINS_SEQUENCE [1,2] with not:true returns the complement (incl. no-signature docs)', async () => {
        expect(await searchFixture(makeElement('CONTAINS_SEQUENCE', [1, 2], true))).toEqual([2, 3, 4, 5, 6, 9]);
    });

    test('CONTAINS_SEQUENCE [2] matches only documents containing element 2 — not element 23', async () => {
        // doc 1 ([1,2] suffix), doc 5 ([2] exact), doc 7 ([1,2,3] middle), doc 8 ([3,1,2] suffix).
        // docs 2 and 3 contain element 23, which must NOT satisfy a search for 2.
        expect(await searchFixture(makeElement('CONTAINS_SEQUENCE', [2]))).toEqual([1, 5, 7, 8]);
    });

    test('CONTAINS_SEQUENCE [23] matches documents containing element 23 (start, end or exact)', async () => {
        // doc 2 ([1,23] suffix), doc 3 ([23,1] start), doc 9 (path [23] exact).
        expect(await searchFixture(makeElement('CONTAINS_SEQUENCE', [23]))).toEqual([2, 3, 9]);
    });

    test('CONTAINS_SEQUENCE [1,2,3] matches only the exact longer path', async () => {
        expect(await searchFixture(makeElement('CONTAINS_SEQUENCE', [1, 2, 3]))).toEqual([7]);
    });
});

describe('Signature handler: invalid inputs', () => {
    test('non-array value yields a non-matching condition (1=0) instead of SQL noise', async () => {
        expect(await searchFixture(makeElement('EQ', 'not-an-array'))).toEqual([]);
    });

    test('array with a non-positive ID yields a non-matching condition', async () => {
        expect(await searchFixture(makeElement('STARTS_WITH', [1, -5]))).toEqual([]);
    });

    test('empty path for STARTS_WITH yields a non-matching condition', async () => {
        expect(await searchFixture(makeElement('STARTS_WITH', []))).toEqual([]);
    });

    test('unsupported condition (FRAGMENT) yields a non-matching condition, never an ignored filter', async () => {
        // A text fragment makes no sense on a signature path; the handler must
        // fail closed (match nothing) rather than return null, which the search
        // builder would treat as "skip this criterion" and return unfiltered rows.
        expect(await searchFixture(makeElement('FRAGMENT', 'x'))).toEqual([]);
    });

    test('foreign field returns null (not handled by this handler)', async () => {
        const result = archiveDocumentSignatureSearchHandler(
            { field: 'otherField', condition: 'EQ', value: [1], not: false } as import('../../backend/src/utils/search').SearchQueryElement,
            ALIAS,
        );
        expect(result).toBeNull();
    });
});
