import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let employeeToken: string;
let userToken: string;
let tagId1: number;
let tagId2: number;
let elementId: number;
let componentId: number;
let createdDocId: number;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;

  await createUser(B, 'archemp', 'ArchEmp1');
  await assignRole(B, adminToken, 'archemp', 'employee');
  const emp = await loginAs(B, 'archemp', 'ArchEmp1');
  employeeToken = emp.token;

  await createUser(B, 'archuser', 'ArchUse1');
  await assignRole(B, adminToken, 'archuser', 'user');
  const user = await loginAs(B, 'archuser', 'ArchUse1');
  userToken = user.token;

  const t1 = await api(B, 'PUT', '/api/tag', { name: 'doc-tag-a' }, adminToken);
  tagId1 = (await t1.json()).tagId;
  const t2 = await api(B, 'PUT', '/api/tag', { name: 'doc-tag-b' }, adminToken);
  tagId2 = (await t2.json()).tagId;

  await api(B, 'PUT', '/api/user/by-login/archuser/tags', { tagIds: [tagId1] }, adminToken);

  const compRes = await api(B, 'PUT', '/api/signature/component', { name: 'Doc Comp' }, adminToken);
  componentId = (await compRes.json()).signatureComponentId;
  const elemRes = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Doc Element' }, adminToken);
  elementId = (await elemRes.json()).signatureElementId;
});

afterAll(async () => {
  await stopTestServer();
});

test('PUT /api/archive/document creates a document', async () => {
  const res = await api(B, 'PUT', '/api/archive/document', {
    type: 'document', title: 'Test Document', creator: 'Test Creator', creationDate: '2024-01-01',
    topographicSignature: 'Sig-001', descriptiveSignatureElementIds: [[elementId]],
    numberOfPages: '10', isDigitized: false, tagIds: [tagId1],
  }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  expect(body.title).toBe('Test Document');
  expect(body.type).toBe('document');
  expect(body.active).toBeTrue();
  expect(body.tags).toBeArray();
  createdDocId = body.archiveDocumentId;
});

test('PUT /api/archive/document creates a unit', async () => {
  const res = await api(B, 'PUT', '/api/archive/document', { type: 'unit', title: 'Test Unit', creator: 'Unit Creator', creationDate: '2024' }, adminToken);
  await expectStatus(res, 201);
  expect((await res.json()).type).toBe('unit');
});

test('PUT /api/archive/document rejects missing required fields', async () => {
  const res = await api(B, 'PUT', '/api/archive/document', { type: 'document' }, adminToken);
  await expectStatus(res, 400);
});

test('GET /api/archive/document/id/:id returns document', async () => {
  const res = await api(B, 'GET', `/api/archive/document/id/${createdDocId}`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).title).toBe('Test Document');
});

test('GET /api/archive/document/id/:id allows user role with matching tags', async () => {
  const res = await api(B, 'GET', `/api/archive/document/id/${createdDocId}`, undefined, userToken);
  await expectStatus(res, 200);
});

test('GET /api/archive/document/id/:id blocks user without matching tags', async () => {
  const doc = await (await api(B, 'PUT', '/api/archive/document', { type: 'document', title: 'Restricted Doc', creator: 'Creator', creationDate: '2024', tagIds: [tagId2] }, adminToken)).json();
  const res = await api(B, 'GET', `/api/archive/document/id/${doc.archiveDocumentId}`, undefined, userToken);
  await expectStatus(res, 403);
});

test('PATCH /api/archive/document/id/:id updates document', async () => {
  const res = await api(B, 'PATCH', `/api/archive/document/id/${createdDocId}`, { title: 'Updated Document', numberOfPages: '20' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).title).toBe('Updated Document');
});

test('DELETE /api/archive/document/id/:id soft-deletes document', async () => {
  const res = await api(B, 'DELETE', `/api/archive/document/id/${createdDocId}`, undefined, adminToken);
  await expectStatus(res, 204);
  const getRes = await api(B, 'GET', `/api/archive/document/id/${createdDocId}`, undefined, adminToken);
  await expectStatus(getRes, 404);
});

test('POST /api/archive/documents/search with type filter', async () => {
  const res = await api(B, 'POST', '/api/archive/documents/search', {
    query: [{ field: 'type', condition: 'EQ', value: 'unit', not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.data.every((d: any) => d.type === 'unit')).toBeTrue();
});

test('POST /api/archive/documents/search user role is filtered by tags', async () => {
  const res = await api(B, 'POST', '/api/archive/documents/search', { query: [], page: 1, pageSize: 10 }, userToken);
  await expectStatus(res, 200);
});

test('POST /api/archive/documents/batch-tag adds tags', async () => {
  const d1 = await api(B, 'PUT', '/api/archive/document', { type: 'document', title: 'Batch Doc 1', creator: 'Test', creationDate: '2024' }, adminToken);
  const d2 = await api(B, 'PUT', '/api/archive/document', { type: 'document', title: 'Batch Doc 2', creator: 'Test', creationDate: '2024' }, adminToken);
  await d1.json(); await d2.json();
  const res = await api(B, 'POST', '/api/archive/documents/batch-tag', {
    searchQuery: [{ field: 'title', condition: 'FRAGMENT', value: 'Batch Doc', not: false }],
    tagIds: [tagId1], action: 'add',
  }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).count).toBe(2);
});

test('POST /api/archive/documents/batch-tag removes tags', async () => {
  const res = await api(B, 'POST', '/api/archive/documents/batch-tag', {
    searchQuery: [{ field: 'title', condition: 'FRAGMENT', value: 'Batch Doc', not: false }],
    tagIds: [tagId1], action: 'remove',
  }, adminToken);
  await expectStatus(res, 200);
});

test('POST /api/archive/documents/batch-tag rejects invalid input', async () => {
  const res = await api(B, 'POST', '/api/archive/documents/batch-tag', { searchQuery: [], tagIds: [], action: 'add' }, adminToken);
  await expectStatus(res, 400);
});

test('Employee can create documents', async () => {
  const res = await api(B, 'PUT', '/api/archive/document', { type: 'document', title: 'Employee Created Doc', creator: 'Emp', creationDate: '2024' }, employeeToken);
  await expectStatus(res, 201);
});

test('Archive endpoints require authentication', async () => {
  const res = await api(B, 'GET', '/api/archive/document/id/1');
  await expectStatus(res, 401);
});
