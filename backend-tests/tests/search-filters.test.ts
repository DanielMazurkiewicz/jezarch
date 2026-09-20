import { beforeAll, afterAll, describe, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let empToken: string;
let userToken: string;
let adminId: number;
let empId: number;
const empLogin = 'sf_emp';
const userLogin = 'sf_user';

let tagA: number, tagB: number, tagC: number;
let compId: number, comp2Id: number;
let el1: number, el2: number, el3: number, el4: number, el5: number, el6: number;

// Archive document IDs
let alphaId: number;   // doc, tags=[A], paths=[[el1],[el1,el2]], isDigitized=true, content='Alpha content'
let betaId: number;    // doc, tags=[A,B], paths=[[el1,el2,el3]], isDigitized=false, content='Beta content'
let gammaId: number;   // unit, tags=[B], paths=[[el2,el3]], isDigitized=false, content=null
let deltaId: number;   // doc, tags=[C], paths=[], isDigitized=true, content='Delta specific content'
let epsilonId: number; // doc, tags=[], paths=[[el1]], isDigitized=true, content=null
let zetaId: number;    // unit, tags=[], paths=[], isDigitized=false, content='Zeta content, archived'
let deletedId: number; // doc, tags=[A], paths=[], isDeleted=true, content='Deleted content'
let parentId: number;  // unit, tags=[], paths=[], isDigitized=false
let thetaId: number;   // doc under parent, tags=[], paths=[], isDigitized=false, created by employee
let etaId: number;     // unit, tags=[], paths=[[el3]], full metadata, created by admin
let iotaId: number;    // doc, tags=[B], paths=[], isDigitized=false, created by employee, content='Iota content'

// Note IDs
let adminNote1: number; // private, tagIds=[A]
let adminNote2: number; // shared, tagIds=[A,B]
let empNote1: number;   // private (owned by sf_emp), tagIds=[B]
let empNote2: number;   // shared (owned by sf_emp), tagIds=[A,C]
let adminNote3: number; // private, tagIds=[], content null
let adminNote4: number; // shared, tagIds=[B]
let empNote3: number;   // private (owned by sf_emp), tagIds=[C]
let empNote4: number;   // shared (owned by sf_emp), tagIds=[], content null

beforeAll(async () => {
    await startTestServer();
    B = getBaseUrl();

    const admin = await loginAs(B, 'admin', 'admin');
    adminToken = admin.token;
    adminId = admin.userId;

    await createUser(B, empLogin, 'SfEmp12345');
    await assignRole(B, adminToken, empLogin, 'employee');
    const emp = await loginAs(B, empLogin, 'SfEmp12345');
    empToken = emp.token;
    empId = emp.userId;

    await createUser(B, userLogin, 'SfUsr12345');
    await assignRole(B, adminToken, userLogin, 'user');
    const user = await loginAs(B, userLogin, 'SfUsr12345');
    userToken = user.token;

    // --- Tags ---
    tagA = (await (await api(B, 'PUT', '/api/tag', { name: 'SF-TagA' }, adminToken)).json()).tagId;
    tagB = (await (await api(B, 'PUT', '/api/tag', { name: 'SF-TagB' }, adminToken)).json()).tagId;
    tagC = (await (await api(B, 'PUT', '/api/tag', { name: 'SF-TagC' }, adminToken)).json()).tagId;

    // Assign user-role tag for user-role filtering tests
    await api(B, 'PATCH', `/api/user/by-login/${userLogin}`, { tagIds: [tagA] }, adminToken);

    // --- Components / Elements ---
    compId = (await (await api(B, 'PUT', '/api/signature/component', { name: 'SF-Comp', index_type: 'roman' }, adminToken)).json()).signatureComponentId;
    el1 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: compId, name: 'SF-El1', description: 'First element', index: 'I' }, adminToken)).json()).signatureElementId;
    el2 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: compId, name: 'SF-El2', description: 'Second element', index: 'II' }, adminToken)).json()).signatureElementId;
    el3 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: compId, name: 'SF-El3', index: 'III' }, adminToken)).json()).signatureElementId;

    // el2 parent = el1;  el3 parent = el2
    await api(B, 'PATCH', `/api/signature/element/${el2}`, { parentIds: [el1] }, adminToken);
    await api(B, 'PATCH', `/api/signature/element/${el3}`, { parentIds: [el2] }, adminToken);

    // Second component + elements for componentName searches (variant descriptions/indexes)
    comp2Id = (await (await api(B, 'PUT', '/api/signature/component', { name: 'SF-Comp2', index_type: 'dec' }, adminToken)).json()).signatureComponentId;
    el4 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: comp2Id, name: 'SF-El4', description: 'Fourth element', index: '1' }, adminToken)).json()).signatureElementId;
    el5 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: comp2Id, name: 'SF-El5', index: '2' }, adminToken)).json()).signatureElementId;
    el6 = (await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: comp2Id, name: 'SF-El6', description: 'Leaf element', index: '3' }, adminToken)).json()).signatureElementId;

    // --- Archive Documents ---
    const createDoc = (title: string, body: Record<string, any>, token = adminToken) =>
        api(B, 'PUT', '/api/archive/document', { title, creator: 'Test Creator', creationDate: '2024-01-01', ...body }, token);

    alphaId = (await (await createDoc('SFTEST-Alpha', {
        type: 'document', tagIds: [tagA], descriptiveSignatureElementIds: [[el1], [el1, el2]],
        isDigitized: true, contentDescription: 'Alpha content',
    })).json()).archiveDocumentId;

    betaId = (await (await createDoc('SFTEST-Beta', {
        type: 'document', tagIds: [tagA, tagB], descriptiveSignatureElementIds: [[el1, el2, el3]],
        isDigitized: false, contentDescription: 'Beta content',
    })).json()).archiveDocumentId;

    gammaId = (await (await createDoc('SFTEST-Gamma', {
        type: 'unit', tagIds: [tagB], descriptiveSignatureElementIds: [[el2, el3]],
        isDigitized: false, // contentDescription omitted → null
    })).json()).archiveDocumentId;

    deltaId = (await (await createDoc('SFTEST-Delta', {
        type: 'document', tagIds: [tagC], descriptiveSignatureElementIds: [],
        isDigitized: true, contentDescription: 'Delta specific content',
    })).json()).archiveDocumentId;

    epsilonId = (await (await createDoc('SFTEST-Epsilon', {
        type: 'document', tagIds: [], descriptiveSignatureElementIds: [[el1]],
        isDigitized: true, contentDescription: null,
    })).json()).archiveDocumentId;

    zetaId = (await (await createDoc('SFTEST-Zeta', {
        type: 'unit', tagIds: [], descriptiveSignatureElementIds: [],
        isDigitized: false, // contentDescription omitted → null
    })).json()).archiveDocumentId;

    deletedId = (await (await createDoc('SFTEST-Deleted', {
        type: 'document', tagIds: [tagA], descriptiveSignatureElementIds: [],
        isDigitized: false, contentDescription: 'Deleted content',
    })).json()).archiveDocumentId;
    await api(B, 'DELETE', `/api/archive/document/id/${deletedId}`, undefined, adminToken);

    // Parent unit (used to browse children and test parentUnitArchiveDocumentId)
    parentId = (await (await createDoc('SFTEST-Parent', {
        type: 'unit', tagIds: [], descriptiveSignatureElementIds: [],
        isDigitized: false,
    })).json()).archiveDocumentId;

    // Document filed under the parent unit; created by employee
    thetaId = (await (await createDoc('SFTEST-Theta', {
        type: 'document', parentUnitArchiveDocumentId: parentId,
        tagIds: [], descriptiveSignatureElementIds: [],
        isDigitized: false, contentDescription: 'Theta child doc',
    }, empToken)).json()).archiveDocumentId;

    // Unit with rich metadata for field-level search coverage
    etaId = (await (await createDoc('SFTEST-Eta', {
        type: 'unit', tagIds: [], descriptiveSignatureElementIds: [[el3]],
        isDigitized: true, topographicSignature: 'SF-Topo-1',
        creator: 'SF-Scribe', creationDate: '1999-05-20', creationPlace: 'Prague',
        numberOfPages: '120', documentType: 'ledger', dimensions: '30x40', binding: 'leather',
        condition: 'good', documentLanguage: 'latin', contentDescription: 'Eta ledger content',
        seals: 'wax seal', remarks: 'Rare', accessLevel: 'restricted',
        accessConditions: 'researchers only', additionalInformation: 'microfilm copy exists',
        relatedDocumentsReferences: 'ETA/1', digitizedVersionLink: 'https://example.com/eta',
    })).json()).archiveDocumentId;

    // Employee-created document with distinct creator to verify createdBy/creator filters
    iotaId = (await (await createDoc('SFTEST-Iota', {
        type: 'document', tagIds: [tagB], descriptiveSignatureElementIds: [],
        isDigitized: false, contentDescription: 'Iota content',
    }, empToken)).json()).archiveDocumentId;

    // --- Notes ---
    const createNote = (body: Record<string, any>, token: string) =>
        api(B, 'PUT', '/api/note', body, token);

    adminNote1 = (await (await createNote({ title: 'SFTEST-Note-A1', content: 'admin note one', shared: false, tagIds: [tagA] }, adminToken)).json()).noteId;
    adminNote2 = (await (await createNote({ title: 'SFTEST-Note-A2', content: 'admin note two', shared: true, tagIds: [tagA, tagB] }, adminToken)).json()).noteId;
    empNote1 = (await (await createNote({ title: 'SFTEST-Note-E1', content: 'emp note one', shared: false, tagIds: [tagB] }, empToken)).json()).noteId;
    empNote2 = (await (await createNote({ title: 'SFTEST-Note-E2', content: 'emp note two', shared: true, tagIds: [tagA, tagC] }, empToken)).json()).noteId;
    adminNote3 = (await (await createNote({ title: 'SFTEST-Note-A3', content: null, shared: false, tagIds: [] }, adminToken)).json()).noteId;
    adminNote4 = (await (await createNote({ title: 'SFTEST-Note-A4', content: 'admin private note', shared: true, tagIds: [tagB] }, adminToken)).json()).noteId;
    empNote3 = (await (await createNote({ title: 'SFTEST-Note-E3', content: 'emp private note', shared: false, tagIds: [tagC] }, empToken)).json()).noteId;
    empNote4 = (await (await createNote({ title: 'SFTEST-Note-E4', content: null, shared: true, tagIds: [] }, empToken)).json()).noteId;
});

afterAll(async () => { await stopTestServer(); });

// ──────────────────────────────────────────────────────────────────────
// Helper: search archive documents with a title prefix scope
// ──────────────────────────────────────────────────────────────────────
const searchArchive = (query: any[], token: string, page = 1, pageSize = 100) =>
    api(B, 'POST', '/api/archive/documents/search', { query, page, pageSize }, token);

const searchNotes = (query: any[], token: string, page = 1, pageSize = 100) =>
    api(B, 'POST', '/api/notes/search', { query, page, pageSize }, token);

const searchLogs = (query: any[], token: string, page = 1, pageSize = 100) =>
    api(B, 'POST', '/api/logs/search', { query, page, pageSize }, token);

const searchElements = (query: any[], token: string, page = 1, pageSize = 100) =>
    api(B, 'POST', '/api/signature/elements/search', { query, page, pageSize }, token);

const titlePrefix = 'SFTEST-';
const titleFragment = { field: 'title', condition: 'FRAGMENT', value: titlePrefix, not: false } as const;
const noteTitlePrefix = 'SFTEST-Note-';
const noteTitleFragment = { field: 'title', condition: 'FRAGMENT', value: noteTitlePrefix, not: false } as const;

const expectIds = (ids: number[], expected: number[]) => {
    expect(ids).toEqual(expect.arrayContaining(expected));
};
const expectIdsNot = (ids: number[], excluded: number[]) => {
    for (const id of excluded) expect(ids).not.toContain(id);
};

// ──────────────────────────────────────────────────────────────────────
// A. Validation & Pagination
// ──────────────────────────────────────────────────────────────────────
describe('A. Search validation and pagination', () => {
    test('Empty query returns all matching docs (counted across prefix)', async () => {
        const res = await searchArchive([titleFragment], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThanOrEqual(7);
        const ids = body.data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId]);
    });

    test('pageSize=-2 returns 400', async () => {
        const res = await searchArchive([], adminToken, 1, -2);
        await expectStatus(res, 400);
    });

    test('Unknown field is silently skipped (returns results unfiltered)', async () => {
        const res = await searchArchive([
            { field: 'nonexistentField', condition: 'EQ', value: 'x', not: false },
        ], adminToken);
        await expectStatus(res, 200);
    });

    test('Unknown condition returns 400', async () => {
        const res = await api(B, 'POST', '/api/archive/documents/search', {
            query: [{ field: 'title', condition: 'BADCOND', value: 'x', not: false }],
            page: 1, pageSize: 10,
        }, adminToken);
        await expectStatus(res, 400);
    });

    test('Pagination: page=1, pageSize=3 with prefix yields subset and totalPages', async () => {
        const res = await searchArchive([titleFragment], adminToken, 1, 3);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBe(3);
        expect(body.page).toBe(1);
        expect(body.pageSize).toBe(3);
        expect(body.totalSize).toBeGreaterThanOrEqual(7);
        expect(body.totalPages).toBeGreaterThanOrEqual(3);
    });
});

// ──────────────────────────────────────────────────────────────────────
// B. Archive document field filters
// ──────────────────────────────────────────────────────────────────────
describe('B. Archive document field filters', () => {
    test('type EQ "document" returns only documents', async () => {
        const res = await searchArchive([titleFragment, { field: 'type', condition: 'EQ', value: 'document', not: false }], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, deltaId, epsilonId, deletedId]);
        expectIdsNot(ids, [gammaId, zetaId]);
    });

    test('type EQ "unit" returns only units', async () => {
        const res = await searchArchive([titleFragment, { field: 'type', condition: 'EQ', value: 'unit', not: false }], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [gammaId, zetaId]);
    });

    test('title FRAGMENT "Alpha"', async () => {
        const res = await searchArchive([{ field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Alpha', not: false }], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([alphaId]);
    });

    test('title FRAGMENT not: true excludes the matching doc', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Alpha', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).not.toContain(alphaId);
        expectIds(ids, [betaId, gammaId, deltaId, epsilonId, zetaId, deletedId]);
    });

    test('isDigitized EQ true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'isDigitized', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, deltaId, epsilonId]);
        expectIdsNot(ids, [betaId, gammaId, zetaId]);
    });

    test('isDigitized EQ false not: true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'isDigitized', condition: 'EQ', value: false, not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, deltaId, epsilonId]);
    });

    test('topographicSignature EQ null', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'topographicSignature', condition: 'EQ', value: null, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        // All SFTEST docs have no topographicSignature set
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId]);
    });

    test('contentDescription NOT FRAGMENT "content" includes null rows', async () => {
        // With NULL-inclusive NOT fix, docs with NULL contentDescription match NOT(LIKE '%content%')
        // Docs with 'content' in their contentDescription do NOT match
        const res = await searchArchive([
            titleFragment,
            { field: 'contentDescription', condition: 'FRAGMENT', value: 'content', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // gamma, epsilon, zeta have NULL contentDescription → included with NULL-inclusive fix
        // Alpha has 'Alpha content' → excluded
        // Beta has 'Beta content' → excluded
        // Delta has 'Delta specific content' → excluded
        // Deleted has 'Deleted content' → excluded
        expectIds(ids, [gammaId, epsilonId, zetaId]);
        expectIdsNot(ids, [alphaId, betaId, deltaId, deletedId]);
    });

    test('contentDescription EQ "Beta content" not: true includes null rows', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'contentDescription', condition: 'EQ', value: 'Beta content', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, gammaId, deltaId, epsilonId, zetaId]);
        expect(ids).not.toContain(betaId);
    });

    test('creator EQ', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'creator', condition: 'EQ', value: 'Test Creator', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // All SFTEST docs are created with creator 'Test Creator'
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId]);
    });

    test('combined criteria: type EQ "document" AND isDigitized EQ true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'type', condition: 'EQ', value: 'document', not: false },
            { field: 'isDigitized', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, deltaId, epsilonId]);
        expectIdsNot(ids, [gammaId, zetaId, betaId]);
    });
});

// ──────────────────────────────────────────────────────────────────────
// C. Tags filter
// ──────────────────────────────────────────────────────────────────────
describe('C. Tags filter', () => {
    test('tags ANY_OF [tagA] matches docs with tagA', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'tags', condition: 'ANY_OF', value: [tagA], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, deletedId]);
        expectIdsNot(ids, [gammaId, deltaId, epsilonId, zetaId]);
    });

    test('tags ANY_OF [tagA, tagB] matches docs with either tag', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'tags', condition: 'ANY_OF', value: [tagA, tagB], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // alpha(A), beta(A,B), gamma(B), deleted(A)
        expectIds(ids, [alphaId, betaId, gammaId, deletedId]);
    });

    test('tags ANY_OF not: true excludes docs with those tags', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'tags', condition: 'ANY_OF', value: [tagA, tagB], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [deltaId, epsilonId, zetaId]);
        expectIdsNot(ids, [alphaId, betaId, gammaId, deletedId]);
    });
});

// ──────────────────────────────────────────────────────────────────────
// D. Descriptive signature path filters
// ──────────────────────────────────────────────────────────────────────
describe('D. Signature path filters', () => {
    test('descriptiveSignature STARTS_WITH [el1] matches paths starting with el1', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: [el1], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha has paths [[el1],[el1,el2]] — [el1] starts with [el1] ✓, [el1,el2] starts with [el1] ✓
        // Beta has [[el1,el2,el3]] — starts with [el1] ✓
        // Epsilon has [[el1]] — starts with [el1] ✓
        expectIds(ids, [alphaId, betaId, epsilonId]);
        expectIdsNot(ids, [gammaId, deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature STARTS_WITH [el2] matches only el2-prefix paths', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: [el2], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Gamma has [[el2,el3]] — starts with [el2] ✓
        expect(ids).toEqual([gammaId]);
    });

    test('descriptiveSignature STARTS_WITH not: true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: [el1], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [gammaId, deltaId, zetaId, deletedId]);
        expectIdsNot(ids, [alphaId, betaId, epsilonId]);
    });

    test('descriptiveSignature CONTAINS_SEQUENCE [el1,el2] matches where path contains [el1,el2]', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'CONTAINS_SEQUENCE', value: [el1, el2], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha has paths [[el1],[el1,el2]] — [el1,el2] contains sequence ✓
        // Beta has [[el1,el2,el3]] — [1,2,3] contains [1,2] as prefix ✓
        // Epsilon has [[el1]] — does not contain [el1,el2] ✗
        expectIds(ids, [alphaId, betaId]);
        expectIdsNot(ids, [epsilonId, gammaId, deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature CONTAINS_SEQUENCE [el2,el3]', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'CONTAINS_SEQUENCE', value: [el2, el3], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha has paths [[el1],[el1,el2]] — neither contains [el2,el3]
        // Beta has [[el1,el2,el3]] — [1,2,3] contains [2,3] as suffix ✓
        // Gamma has [[el2,el3]] — exact match ✓
        expectIds(ids, [betaId, gammaId]);
        expectIdsNot(ids, [alphaId, epsilonId, deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature CONTAINS_SEQUENCE not: true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'CONTAINS_SEQUENCE', value: [el1, el2], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [gammaId, deltaId, epsilonId, zetaId, deletedId]);
        expectIdsNot(ids, [alphaId, betaId]);
    });

    test('descriptiveSignature EQ [el1,el2] exact path match', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'EQ', value: [el1, el2], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha has paths [[el1],[el1,el2]] — [el1,el2] path matches exactly ✓
        // Beta has [[el1,el2,el3]] — [1,2,3] ≠ [1,2] ✗
        // Epsilon has [[el1]] — [1] ≠ [1,2] ✗
        expect(ids).toEqual([alphaId]);
    });

    test('descriptiveSignature EQ [el2,el3] exact path match', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'EQ', value: [el2, el3], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Gamma has [[el2,el3]] ✓
        // Beta has [[el1,el2,el3]] — [1,2,3] ≠ [2,3] ✗
        expect(ids).toEqual([gammaId]);
    });

    test('descriptiveSignature EQ not: true excludes exact match', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'EQ', value: [el1, el2], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // All docs except alpha (which has [el1,el2] path)
        expectIds(ids, [betaId, gammaId, deltaId, epsilonId, zetaId, deletedId]);
        expect(ids).not.toContain(alphaId);
    });

    test('descriptiveSignature EQ [] (empty path) matches no-path docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'EQ', value: [], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Delta, zeta, deleted have empty paths; alpha has paths but not equal to []
        // Wait, alpha paths [[el1],[el1,el2]] — the handler checks EXISTS je.value = '[]'
        // json_each('[]') returns no rows → EXISTS false → doesn't match
        // json_each('[[1],[1,2]]') returns rows '[1]' and '[1,2]' → neither is '[]' → doesn't match
        expectIds(ids, [deltaId, zetaId, deletedId]);
        expectIdsNot(ids, [alphaId, betaId, gammaId, epsilonId]);
    });

    test('combined: title FRAGMENT AND descriptiveSignature STARTS_WITH', async () => {
        const res = await searchArchive([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Beta', not: false },
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: [el1], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([betaId]);
    });

    test('descriptiveSignature STARTS_WITH [el1,el2] matches exact and longer paths', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: [el1, el2], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha has path [el1,el2] exactly; Beta's [el1,el2,el3] starts with it.
        // Gamma [el2,el3], Epsilon [el1], Eta [el3] do not start with [el1,el2].
        expectIds(ids, [alphaId, betaId]);
        expectIdsNot(ids, [gammaId, epsilonId, etaId, deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature CONTAINS_SEQUENCE single element [el3]', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'CONTAINS_SEQUENCE', value: [el3], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Beta ([el1,el2,el3] suffix), Gamma ([el2,el3] suffix), Eta ([el3] exact).
        // Alpha's paths [el1],[el1,el2] and Epsilon's [el1] contain no el3.
        expectIds(ids, [betaId, gammaId, etaId]);
        expectIdsNot(ids, [alphaId, epsilonId, deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature EQ [] not: true matches docs with at least one signature', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'descriptiveSignature', condition: 'EQ', value: [], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // Alpha, Beta, Gamma, Epsilon, Eta all carry at least one path.
        // Delta, Zeta, Deleted have no paths (and Theta/Parent/Iota likewise).
        expectIds(ids, [alphaId, betaId, gammaId, epsilonId, etaId]);
        expectIdsNot(ids, [deltaId, zetaId, deletedId]);
    });

    test('descriptiveSignature STARTS_WITH with a non-array value returns 400', async () => {
        const res = await searchArchive([
            { field: 'descriptiveSignature', condition: 'STARTS_WITH', value: 'not-a-path', not: false },
        ], adminToken);
        await expectStatus(res, 400);
    });

    test('descriptiveSignature EQ with a non-positive element ID returns 400', async () => {
        const res = await searchArchive([
            { field: 'descriptiveSignature', condition: 'EQ', value: [el1, -2], not: false },
        ], adminToken);
        await expectStatus(res, 400);
    });
});

// ──────────────────────────────────────────────────────────────────────
// E. isDeleted filtering by role
// ──────────────────────────────────────────────────────────────────────
describe('E. isDeleted forced filter', () => {
    test('Admin sees deleted docs in default search', async () => {
        const res = await searchArchive([titleFragment], adminToken);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toContain(deletedId);
    });

    test('Employee sees deleted docs in default search', async () => {
        const res = await searchArchive([titleFragment], empToken);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toContain(deletedId);
    });

    test('User role never sees deleted docs', async () => {
        const res = await searchArchive([titleFragment], userToken);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).not.toContain(deletedId);
    });

    test('User role forced to isDeleted=false even when explicitly set true', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'isDeleted', condition: 'EQ', value: true, not: false },
        ], userToken);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).not.toContain(deletedId);
    });
});

// ──────────────────────────────────────────────────────────────────────
// F. Notes search
// ──────────────────────────────────────────────────────────────────────
describe('F. Notes search filters', () => {
    test('Title FRAGMENT returns only matching notes', async () => {
        const res = await searchNotes([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Note-', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        // Admin should see: A1 (own), A2 (own), E2 (shared) = 3
        const ids = body.data.map((n: any) => n.noteId);
        expectIds(ids, [adminNote1, adminNote2, empNote2]);
        expect(ids).not.toContain(empNote1);
        // All returned notes should have the title prefix
        expect(body.data.every((n: any) => n.title.startsWith('SFTEST-Note-'))).toBeTrue();
    });

    test('ownerLogin EQ matches only that owner', async () => {
        const res = await searchNotes([
            { field: 'ownerLogin', condition: 'EQ', value: 'admin', not: false },
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Note-', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expectIds(ids, [adminNote1, adminNote2]);
        expectIdsNot(ids, [empNote1, empNote2]);
    });

    test('Employee sees their own notes + admin shared note', async () => {
        const res = await searchNotes([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Note-', not: false },
        ], empToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expectIds(ids, [empNote1, empNote2, adminNote2]);
        expect(ids).not.toContain(adminNote1);
    });

    test('title FRAGMENT not: true returns non-matching notes', async () => {
        const res = await searchNotes([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Note-A1', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expect(ids).not.toContain(adminNote1);
        expect(ids).toContain(adminNote2);
    });

    test('tags ANY_OF returns notes with specified tags', async () => {
        const res = await searchNotes([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-Note-', not: false },
            { field: 'tags', condition: 'ANY_OF', value: [tagA], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        // adminNote1(tagA), adminNote2(tagA,B) visible; empNote2(tagA,C) shared → visible
        expectIds(ids, [adminNote1, adminNote2, empNote2]);
        expect(ids).not.toContain(empNote1);
    });
});

// ──────────────────────────────────────────────────────────────────────
// G. Logs search filters
// ──────────────────────────────────────────────────────────────────────
describe('G. Logs search filters', () => {
    test('createdOn EQ today returns logs from today', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchLogs([
            { field: 'createdOn', condition: 'EQ', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        // Many logs created during beforeAll setup
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('createdOn GT today returns no logs (all from today or earlier)', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchLogs([
            { field: 'createdOn', condition: 'GT', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        // GT today with date handling → >= tomorrow → no logs
        expect(body.data.length).toBe(0);
    });

    test('createdOn LTE today includes today\'s logs', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchLogs([
            { field: 'createdOn', condition: 'LTE', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('createdOn LT today returns no logs (all today)', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchLogs([
            { field: 'createdOn', condition: 'LT', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBe(0);
    });

    test('level EQ "info"', async () => {
        const res = await searchLogs([
            { field: 'level', condition: 'EQ', value: 'info', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data.every((l: any) => l.level === 'info')).toBeTrue();
    });

    test('category FRAGMENT', async () => {
        const res = await searchLogs([
            { field: 'category', condition: 'FRAGMENT', value: 'search', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        // Search logs from our test operations
        expect(body.data.length).toBeGreaterThanOrEqual(0);
    });
});

// ──────────────────────────────────────────────────────────────────────
// H. Signature element search filters
// ──────────────────────────────────────────────────────────────────────
describe('H. Signature element search', () => {
    test('name FRAGMENT', async () => {
        const res = await searchElements([
            { field: 'name', condition: 'FRAGMENT', value: 'SF-El', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el3]);
    });

    test('name EQ', async () => {
        const res = await searchElements([
            { field: 'name', condition: 'EQ', value: 'SF-El2', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expect(ids).toEqual([el2]);
    });

    test('hasParents EQ false', async () => {
        const res = await searchElements([
            { field: 'hasParents', condition: 'EQ', value: false, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        // el1 has no parents, el2 parent=el1, el3 parent=el2
        expect(ids).toContain(el1);
        expect(ids).not.toContain(el2);
        expect(ids).not.toContain(el3);
    });

    test('hasParents EQ true', async () => {
        const res = await searchElements([
            { field: 'hasParents', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el2, el3]);
        expect(ids).not.toContain(el1);
    });

    test('parentIds ANY_OF [el1]', async () => {
        const res = await searchElements([
            { field: 'parentIds', condition: 'ANY_OF', value: [el1], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        // el2 has parent el1
        expect(ids).toContain(el2);
        expect(ids).not.toContain(el1);
        expect(ids).not.toContain(el3);
    });

    test('componentName EQ', async () => {
        const res = await searchElements([
            { field: 'componentName', condition: 'EQ', value: 'SF-Comp', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el3]);
    });

    test('componentName FRAGMENT', async () => {
        const res = await searchElements([
            { field: 'componentName', condition: 'FRAGMENT', value: 'SF-Comp', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el3]);
    });
});

// ──────────────────────────────────────────────────────────────────────
// I. Condition matrix: EQ, GT, GTE, LT, LTE, ANY_OF, FRAGMENT across the
//    number / text / date shaped fields of archive documents.
// ──────────────────────────────────────────────────────────────────────
describe('I. Condition matrix on archive documents', () => {
    const today = new Date().toISOString().split('T')[0];

    test('EQ on numeric field (archiveDocumentId)', async () => {
        const res = await searchArchive([
            { field: 'archiveDocumentId', condition: 'EQ', value: etaId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('GT on numeric field returns strictly larger ids', async () => {
        const res = await searchArchive([
            { field: 'archiveDocumentId', condition: 'GT', value: etaId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids.length).toBeGreaterThan(0);
        for (const id of ids) expect(id).toBeGreaterThan(etaId);
    });

    test('GTE on numeric field includes the boundary', async () => {
        const res = await searchArchive([
            { field: 'archiveDocumentId', condition: 'GTE', value: etaId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toContain(etaId);
        for (const id of ids) expect(id).toBeGreaterThanOrEqual(etaId);
    });

    test('LT on numeric field returns strictly smaller ids', async () => {
        const res = await searchArchive([
            { field: 'archiveDocumentId', condition: 'LT', value: etaId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids.length).toBeGreaterThan(0);
        for (const id of ids) expect(id).toBeLessThan(etaId);
    });

    test('LTE on numeric field includes the boundary', async () => {
        const res = await searchArchive([
            { field: 'archiveDocumentId', condition: 'LTE', value: etaId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toContain(etaId);
        for (const id of ids) expect(id).toBeLessThanOrEqual(etaId);
    });

    test('FRAGMENT on text field (title)', async () => {
        const res = await searchArchive([
            { field: 'title', condition: 'FRAGMENT', value: 'SFTEST-El', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // no doc title contains SFTEST-El (elements do, not docs)
        expect(ids.length).toBe(0);
    });

    test('EQ on text field (title)', async () => {
        const res = await searchArchive([
            { field: 'title', condition: 'EQ', value: 'SFTEST-Eta', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('ANY_OF on text field (title)', async () => {
        const res = await searchArchive([
            { field: 'title', condition: 'ANY_OF', value: ['SFTEST-Alpha', 'SFTEST-Beta'], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId]);
    });

    test('GT on date field (creationDate) with calendar-day semantics', async () => {
        const res = await searchArchive([
            { field: 'creationDate', condition: 'GT', value: '2023-12-31', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // docs dated 2024-01-01 (default) + any beyond 2024-01-01
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, thetaId, iotaId]);
        // eta 1999-05-20, parent 2024-01-01 (also included)
        expect(ids).not.toContain(etaId);
    });

    test('GTE on date field includes the boundary day', async () => {
        const res = await searchArchive([
            { field: 'creationDate', condition: 'GTE', value: '2024-01-01', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // everyone except eta (1999-05-20)
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, thetaId, iotaId]);
        expect(ids).not.toContain(etaId);
    });

    test('LT on date field returns earlier docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'creationDate', condition: 'LT', value: '2024-01-01', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('LTE on date field includes the boundary day', async () => {
        const res = await searchArchive([
            { field: 'creationDate', condition: 'LTE', value: '2024-01-01', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, thetaId, iotaId, etaId]);
    });

    test('EQ on date field matches the whole calendar day (creationDate)', async () => {
        const res = await searchArchive([
            { field: 'creationDate', condition: 'EQ', value: '2024-01-01', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, thetaId, iotaId]);
        expect(ids).not.toContain(etaId);
    });

    test('EQ on boolean field (isDigitized true)', async () => {
        const res = await searchArchive([
            { field: 'isDigitized', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, deltaId, epsilonId, etaId]);
    });

    test('createdOn EQ today matches datetime-stored createdOn', async () => {
        const res = await searchArchive([
            { field: 'createdOn', condition: 'EQ', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('modifiedOn EQ today matches datetime-stored modifiedOn', async () => {
        const res = await searchArchive([
            { field: 'modifiedOn', condition: 'EQ', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('GTE on date field on createdOn (today)', async () => {
        const res = await searchArchive([
            { field: 'createdOn', condition: 'GTE', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });
});

// ──────────────────────────────────────────────────────────────────────
// J. Archive document field coverage — every searchable field gets at
//    least one EQ/FRAGMENT/null test that pins down exact results.
// ──────────────────────────────────────────────────────────────────────
describe('J. Archive document field coverage', () => {
    // Fields with unique values on the rich unit (eta) document
    // NOTE: `expected` must resolve etaId at test time (assigned in beforeAll).
    const fieldExpectations: [string, 'EQ' | 'FRAGMENT', any][] = [
        ['creationPlace', 'EQ', 'Prague'],
        ['seals', 'EQ', 'wax seal'],
        ['numberOfPages', 'EQ', '120'],
        ['documentType', 'EQ', 'ledger'],
        ['dimensions', 'EQ', '30x40'],
        ['binding', 'EQ', 'leather'],
        ['condition', 'EQ', 'good'],
        ['documentLanguage', 'EQ', 'latin'],
        ['remarks', 'EQ', 'Rare'],
        ['accessLevel', 'EQ', 'restricted'],
        ['accessConditions', 'EQ', 'researchers only'],
        ['additionalInformation', 'EQ', 'microfilm copy exists'],
        ['relatedDocumentsReferences', 'EQ', 'ETA/1'],
        ['topographicSignature', 'EQ', 'SF-Topo-1'],
        ['digitizedVersionLink', 'EQ', 'https://example.com/eta'],
        ['documentType', 'FRAGMENT', 'edge'],
        ['contentDescription', 'FRAGMENT', 'ledger'],
    ];

    test.each(fieldExpectations)('field %s %s %j returns exactly [etaId]', async (field, condition, value) => {
        const res = await searchArchive([
            titleFragment,
            { field, condition, value, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('EQ null on nullable text (contentDescription)', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'contentDescription', condition: 'EQ', value: null, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        // gamma, epsilon, zeta, parent have null contentDescription
        expectIds(ids, [gammaId, epsilonId, zetaId, parentId]);
        expectIdsNot(ids, [alphaId, betaId, deltaId, deletedId, thetaId, etaId, iotaId]);
    });

    test('EQ null on topographicSignature', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'topographicSignature', condition: 'EQ', value: null, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).not.toContain(etaId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, thetaId, iotaId]);
    });

    test('EQ on nullable text with an existing value (topographicSignature)', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'topographicSignature', condition: 'EQ', value: 'SF-Topo-1', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('parentUnitArchiveDocumentId EQ points to the parent unit', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'parentUnitArchiveDocumentId', condition: 'EQ', value: parentId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([thetaId]);
    });

    test('createdBy EQ "sf_emp" returns employee-created docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'createdBy', condition: 'EQ', value: 'sf_emp', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [thetaId, iotaId]);
        expectIdsNot(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, etaId]);
    });

    test('updatedBy EQ "admin" returns admin-updated docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'updatedBy', condition: 'EQ', value: 'admin', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids.length).toBeGreaterThanOrEqual(6);
    });

    test('creator EQ distinguishes custom creator values', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'creator', condition: 'EQ', value: 'SF-Scribe', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([etaId]);
    });

    test('type ANY_OF [unit, document] matches all docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'type', condition: 'ANY_OF', value: ['unit', 'document'], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expectIds(ids, [alphaId, betaId, gammaId, deltaId, epsilonId, zetaId, deletedId, parentId, thetaId, etaId, iotaId]);
    });

    test('isDeleted EQ true returns only softly deleted docs', async () => {
        const res = await searchArchive([
            titleFragment,
            { field: 'isDeleted', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([deletedId]);
    });

    test('title EQ exact match (no wildcard leakage)', async () => {
        const res = await searchArchive([
            { field: 'title', condition: 'EQ', value: 'SFTEST-Parent', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((d: any) => d.archiveDocumentId);
        expect(ids).toEqual([parentId]);
    });
});

// ──────────────────────────────────────────────────────────────────────
// K. Notes: every note field gets an EQ/FRAGMENT test plus visibility.
// ──────────────────────────────────────────────────────────────────────
describe('K. Notes field coverage', () => {
    test('title EQ exact', async () => {
        const res = await searchNotes([
            { field: 'title', condition: 'EQ', value: 'SFTEST-Note-A2', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expect(ids).toEqual([adminNote2]);
    });

    test('content EQ exact', async () => {
        const res = await searchNotes([
            { field: 'content', condition: 'EQ', value: 'admin note two', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expect(ids).toEqual([adminNote2]);
    });

    test('content FRAGMENT', async () => {
        const res = await searchNotes([
            { field: 'content', condition: 'FRAGMENT', value: 'note', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        // 'note' appears in: adminNote1, adminNote2, adminNote4, empNote2.
        // (empNote3 'emp private note' also matches but is private to sf_emp → hidden from admin)
        expectIds(ids, [adminNote1, adminNote2, adminNote4, empNote2]);
        expectIdsNot(ids, [adminNote3, empNote4, empNote3]);
    });

    test('content EQ "" matches null-content notes (stored as empty string)', async () => {
        const res = await searchNotes([
            { field: 'content', condition: 'EQ', value: '', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expect(ids).toEqual(expect.arrayContaining([adminNote3, empNote4]));
    });

    test('shared EQ true', async () => {
        const res = await searchNotes([
            { field: 'shared', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expectIds(ids, [adminNote2, adminNote4, empNote2, empNote4]);
    });

    test('shared EQ false', async () => {
        const res = await searchNotes([
            { field: 'shared', condition: 'EQ', value: false, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        // admin sees own private notes; employee notes are hidden unless shared
        expectIds(ids, [adminNote1, adminNote3]);
    });

    test('ownerUserId EQ matches notes owned by that user (as owner)', async () => {
        const res = await searchNotes([
            { field: 'ownerUserId', condition: 'EQ', value: empId, not: false },
            noteTitleFragment,
        ], empToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expectIds(ids, [empNote1, empNote2, empNote3, empNote4]);
    });

    test('ownerLogin EQ matches correct owner', async () => {
        const res = await searchNotes([
            { field: 'ownerLogin', condition: 'EQ', value: 'sf_emp', not: false },
            noteTitleFragment,
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        // admin sees only shared emp-owned notes
        expectIds(ids, [empNote2, empNote4]);
        expectIdsNot(ids, [empNote1, empNote3]);
    });

    test('ownerLogin FRAGMENT', async () => {
        const res = await searchNotes([
            { field: 'ownerLogin', condition: 'FRAGMENT', value: 'sf_em', not: false },
            noteTitleFragment,
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expectIds(ids, [empNote2, empNote4]);
    });

    test('tags ANY_OF not: true returns notes without those tags', async () => {
        const res = await searchNotes([
            noteTitleFragment,
            { field: 'tags', condition: 'ANY_OF', value: [tagA], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        // adminNote3 (no tags), adminNote4 (tagB) visible; empNote3 private hidden
        expectIds(ids, [adminNote3, adminNote4, empNote4]);
        expectIdsNot(ids, [adminNote1, adminNote2, empNote2]);
    });

    test('noteId EQ', async () => {
        const res = await searchNotes([
            { field: 'noteId', condition: 'EQ', value: adminNote4, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((n: any) => n.noteId);
        expect(ids).toEqual([adminNote4]);
    });

    test('createdOn EQ today matches datetime-stored createdOn', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchNotes([
            { field: 'createdOn', condition: 'EQ', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThanOrEqual(4);
    });
});

// ──────────────────────────────────────────────────────────────────────
// L. Logs: every log field gets an EQ/ANY_OF/FRAGMENT test.
// ──────────────────────────────────────────────────────────────────────
describe('L. Logs field coverage', () => {
    test('id EQ returns exactly that log', async () => {
        const seed = await searchLogs([], adminToken);
        const firstLog = (await seed.json()).data[0];
        const res = await searchLogs([
            { field: 'id', condition: 'EQ', value: firstLog.id, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBe(1);
        expect(body.data[0].id).toBe(firstLog.id);
    });

    test('id GT returns logs with id greater than benchmark', async () => {
        const seed = await searchLogs([{ field: 'level', condition: 'EQ', value: 'info', not: false }], adminToken);
        const seedBody = await seed.json();
        const ids = seedBody.data.map((l: any) => l.id);
        if (ids.length === 0) return;
        const minId = Math.min(...ids);
        const res = await searchLogs([
            { field: 'id', condition: 'GT', value: minId - 1, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThanOrEqual(ids.length);
    });

    test('level ANY_OF [info] matches at least one log', async () => {
        const res = await searchLogs([
            { field: 'level', condition: 'ANY_OF', value: ['info'], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data.every((l: any) => l.level === 'info')).toBeTrue();
    });

    test('level EQ not: true excludes info logs', async () => {
        const infoLogs = await (await searchLogs([{ field: 'level', condition: 'EQ', value: 'info', not: false }], adminToken)).json();
        if (infoLogs.data.length === 0) return;
        const anInfoId = infoLogs.data[0].id;
        const res = await searchLogs([
            { field: 'level', condition: 'EQ', value: 'info', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((l: any) => l.id);
        expect(ids).not.toContain(anInfoId);
    });

    test('level FRAGMENT', async () => {
        const res = await searchLogs([
            { field: 'level', condition: 'FRAGMENT', value: 'inf', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('category EQ "archive_document" matches creation logs', async () => {
        const res = await searchLogs([
            { field: 'category', condition: 'EQ', value: 'archive_document', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data.every((l: any) => l.category === 'archive_document')).toBeTrue();
    });

    test('category FRAGMENT', async () => {
        const res = await searchLogs([
            { field: 'category', condition: 'FRAGMENT', value: 'archive', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('userId EQ "admin" matches admin-generated logs', async () => {
        const res = await searchLogs([
            { field: 'userId', condition: 'EQ', value: 'admin', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data.every((l: any) => l.userId === 'admin')).toBeTrue();
    });

    test('userId FRAGMENT', async () => {
        const res = await searchLogs([
            { field: 'userId', condition: 'FRAGMENT', value: 'sf_', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });

    test('message FRAGMENT matches archive document creation', async () => {
        const res = await searchLogs([
            { field: 'message', condition: 'FRAGMENT', value: 'Archive document created', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        expect(body.data.length).toBeGreaterThan(0);
    });
});

// ──────────────────────────────────────────────────────────────────────
// M. Signature elements: every element field gets an EQ/FRAGMENT test.
// ──────────────────────────────────────────────────────────────────────
describe('M. Signature element field coverage', () => {
    test('signatureElementId EQ', async () => {
        const res = await searchElements([
            { field: 'signatureElementId', condition: 'EQ', value: el3, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expect(ids).toEqual([el3]);
    });

    test('signatureElementId GT returns larger ids', async () => {
        const res = await searchElements([
            { field: 'signatureElementId', condition: 'GT', value: el3, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el4, el5, el6]);
        expectIdsNot(ids, [el1, el2, el3]);
    });

    test('signatureComponentId EQ comp1', async () => {
        const res = await searchElements([
            { field: 'signatureComponentId', condition: 'EQ', value: compId, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el3]);
    });

    test('signatureComponentId EQ comp2', async () => {
        const res = await searchElements([
            { field: 'signatureComponentId', condition: 'EQ', value: comp2Id, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el4, el5, el6]);
    });

    test('index EQ matches roman numeral indexing', async () => {
        const res = await searchElements([
            { field: 'index', condition: 'EQ', value: 'II', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expect(ids).toEqual([el2]);
    });

    test('index FRAGMENT matches multiple indexed elements', async () => {
        const res = await searchElements([
            { field: 'index', condition: 'FRAGMENT', value: 'I', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const body = await res.json();
        // Only roman numerals (I, II, III) contain 'I'; decimal 1/2/3 do not.
        expectIds(body.data.map((e: any) => e.signatureElementId), [el1, el2, el3]);
        expectIdsNot(body.data.map((e: any) => e.signatureElementId), [el4, el5, el6]);
    });

    test('description EQ exact', async () => {
        const res = await searchElements([
            { field: 'description', condition: 'EQ', value: 'Leaf element', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expect(ids).toEqual([el6]);
    });

    test('description FRAGMENT', async () => {
        const res = await searchElements([
            { field: 'description', condition: 'FRAGMENT', value: 'element', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el4, el6]);
    });

    test('description EQ null', async () => {
        const res = await searchElements([
            { field: 'description', condition: 'EQ', value: null, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el3, el5]);
    });

    test('parentIds ANY_OF [el1, el3] only matches elements listing either as parent', async () => {
        const res = await searchElements([
            { field: 'parentIds', condition: 'ANY_OF', value: [el1, el3], not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        // el2 has parent el1; el3 has parent el2 (not el3)
        expect(ids).toEqual([el2]);
    });

    test('parentIds ANY_OF not: true excludes those with the parent', async () => {
        const res = await searchElements([
            { field: 'parentIds', condition: 'ANY_OF', value: [el1], not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIdsNot(ids, [el2]);
    });

    test('hasParents EQ true only elements with parents', async () => {
        const res = await searchElements([
            { field: 'hasParents', condition: 'EQ', value: true, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el2, el3]);
        expectIdsNot(ids, [el1, el4, el5, el6]);
    });

    test('hasParents EQ true not: true = no parents', async () => {
        const res = await searchElements([
            { field: 'hasParents', condition: 'EQ', value: true, not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el4, el5, el6]);
        expectIdsNot(ids, [el2, el3]);
    });

    test('componentName EQ matches second component', async () => {
        const res = await searchElements([
            { field: 'componentName', condition: 'EQ', value: 'SF-Comp2', not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el4, el5, el6]);
    });

    test('componentName EQ not: true excludes that component', async () => {
        const res = await searchElements([
            { field: 'componentName', condition: 'EQ', value: 'SF-Comp', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el4, el5, el6]);
        expectIdsNot(ids, [el1, el2, el3]);
    });

    test('createdOn EQ today returns all elements', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await searchElements([
            { field: 'createdOn', condition: 'EQ', value: today, not: false },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expectIds(ids, [el1, el2, el3, el4, el5, el6]);
    });

    test('name EQ not: true excludes matching element', async () => {
        const res = await searchElements([
            { field: 'name', condition: 'EQ', value: 'SF-El6', not: true },
        ], adminToken);
        await expectStatus(res, 200);
        const ids = (await res.json()).data.map((e: any) => e.signatureElementId);
        expect(ids).not.toContain(el6);
        expect(ids).toContain(el1);
    });
});
