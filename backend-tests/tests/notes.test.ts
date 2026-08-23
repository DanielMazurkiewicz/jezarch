import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let employeeToken: string;
let tagId1: number;
let tagId2: number;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;

  await createUser(B, 'noteemp', 'NoteEmp1');
  await assignRole(B, adminToken, 'noteemp', 'employee');
  const emp = await loginAs(B, 'noteemp', 'NoteEmp1');
  employeeToken = emp.token;

  const t1 = await api(B, 'PUT', '/api/tag', { name: 'note-tag-a' }, adminToken);
  tagId1 = (await t1.json()).tagId;
  const t2 = await api(B, 'PUT', '/api/tag', { name: 'note-tag-b' }, adminToken);
  tagId2 = (await t2.json()).tagId;
});

afterAll(async () => {
  await stopTestServer();
});

test('PUT /api/note creates a note', async () => {
  const res = await api(B, 'PUT', '/api/note', { title: 'My Note', content: 'Hello world', shared: false }, adminToken);
  await expectStatus(res, 201);
});

test('PUT /api/note creates a note with tags', async () => {
  const res = await api(B, 'PUT', '/api/note', { title: 'Tagged Note', content: 'Content', tagIds: [tagId1, tagId2] }, adminToken);
  await expectStatus(res, 201);
});

test('PUT /api/note rejects missing title', async () => {
  const res = await api(B, 'PUT', '/api/note', { content: 'No title' }, adminToken);
  await expectStatus(res, 400);
});

test('GET /api/note/id/:noteId returns own note', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'My Private', content: 'Secret', shared: false }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'GET', `/api/note/id/${created.noteId}`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).title).toBe('My Private');
});

test('GET /api/note/id/:noteId returns shared note for others', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Shared Note', content: 'Shared content', shared: true }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'GET', `/api/note/id/${created.noteId}`, undefined, employeeToken);
  await expectStatus(res, 200);
});

test('GET /api/note/id/:noteId blocks non-shared note from others', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Private Note', content: 'Mine', shared: false }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'GET', `/api/note/id/${created.noteId}`, undefined, employeeToken);
  await expectStatus(res, 403);
});

test('PATCH /api/note/id/:noteId updates a note', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Original', content: 'Original content', shared: false }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'PATCH', `/api/note/id/${created.noteId}`, { title: 'Updated', content: 'Updated content', shared: true, tagIds: [tagId1] }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).title).toBe('Updated');
});

test('DELETE /api/note/id/:noteId deletes own note', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Delete Me', content: 'Bye', shared: false }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'DELETE', `/api/note/id/${created.noteId}`, undefined, adminToken);
  await expectStatus(res, 200);
});

test('DELETE /api/note/id/:noteId blocks non-owner non-admin', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Not Mine', content: 'Yours', shared: false }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'DELETE', `/api/note/id/${created.noteId}`, undefined, employeeToken);
  await expectStatus(res, 403);
});

test('GET /api/notes/by-login/:login returns own notes', async () => {
  const res = await api(B, 'GET', `/api/notes/by-login/admin`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json())).toBeArray();
});

test('GET /api/notes/by-login/:login blocks unauthorized access', async () => {
  const res = await api(B, 'GET', `/api/notes/by-login/admin`, undefined, employeeToken);
  await expectStatus(res, 403);
});

test('POST /api/notes/search searches notes', async () => {
  const res = await api(B, 'POST', '/api/notes/search', {
    query: [{ field: 'title', condition: 'FRAGMENT', value: 'Tagged', not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.data).toBeArray();
  expect(body.totalSize).toBeGreaterThanOrEqual(1);
});

test('POST /api/notes/search supports pagination', async () => {
  const res = await api(B, 'POST', '/api/notes/search', { query: [], page: 1, pageSize: 2 }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.data.length).toBeLessThanOrEqual(2);
  expect(body.page).toBe(1);
  expect(body.pageSize).toBe(2);
});

test('POST /api/notes/search filters by tags', async () => {
  const res = await api(B, 'POST', '/api/notes/search', {
    query: [{ field: 'tags', condition: 'ANY_OF', value: [tagId1], not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  body.data.forEach((note: any) => {
    expect(note.tags.some((t: any) => t.tagId === tagId1)).toBeTrue();
  });
});

test('Employee can create and search notes', async () => {
  const createRes = await api(B, 'PUT', '/api/note', { title: 'Employee Note', content: 'Emp content' }, employeeToken);
  await expectStatus(createRes, 201);
  const searchRes = await api(B, 'POST', '/api/notes/search', {
    query: [{ field: 'title', condition: 'EQ', value: 'Employee Note', not: false }],
    page: 1, pageSize: 10,
  }, employeeToken);
  await expectStatus(searchRes, 200);
  const body = await searchRes.json();
  expect(body.data.some((n: any) => n.title === 'Employee Note')).toBeTrue();
});

test('Notes endpoints reject unauthenticated', async () => {
  const res = await api(B, 'GET', '/api/note/id/1');
  await expectStatus(res, 401);
});
