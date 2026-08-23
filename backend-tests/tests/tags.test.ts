import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let employeeToken: string;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;

  await createUser(B, 'tagemp', 'TagEmp123');
  await assignRole(B, adminToken, 'tagemp', 'employee');
  const emp = await loginAs(B, 'tagemp', 'TagEmp123');
  employeeToken = emp.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('PUT /api/tag creates a tag', async () => {
  const res = await api(B, 'PUT', '/api/tag', { name: 'Important', description: 'Important items' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  expect(body.name).toBe('Important');
  expect(body.description).toBe('Important items');
});

test('PUT /api/tag rejects duplicate name (unique index on tags.name)', async () => {
  const res = await api(B, 'PUT', '/api/tag', { name: 'Important', description: 'dup' }, adminToken);
  await expectStatus(res, 409);
});

test('PUT /api/tag rejects empty name', async () => {
  const res = await api(B, 'PUT', '/api/tag', { name: '' }, adminToken);
  await expectStatus(res, 400);
});

test('GET /api/tags returns all tags', async () => {
  const res = await api(B, 'GET', '/api/tags', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body).toBeArray();
  expect(body.some((t: any) => t.name === 'Important')).toBeTrue();
});

test('GET /api/tag/id/:tagId returns single tag', async () => {
  const tagsRes = await api(B, 'GET', '/api/tags', undefined, adminToken);
  const tags = await tagsRes.json();
  const tagId = tags.find((t: any) => t.name === 'Important')!.tagId;
  const res = await api(B, `GET`, `/api/tag/id/${tagId}`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Important');
});

test('GET /api/tag/id/:tagId returns 404 for non-existent', async () => {
  const res = await api(B, 'GET', '/api/tag/id/99999', undefined, adminToken);
  await expectStatus(res, 404);
});

test('PATCH /api/tag/id/:tagId updates tag', async () => {
  const tagsRes = await api(B, 'GET', '/api/tags', undefined, adminToken);
  const tags = await tagsRes.json();
  const tagId = tags.find((t: any) => t.name === 'Important')!.tagId;
  const res = await api(B, 'PATCH', `/api/tag/id/${tagId}`, { name: 'Critical', description: 'Updated' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Critical');
});

test('PATCH /api/tag/id/:tagId allows employee (employees manage tags)', async () => {
  const tagsRes = await api(B, 'GET', '/api/tags', undefined, adminToken);
  const tags = await tagsRes.json();
  const tagId = tags.find((t: any) => t.name === 'Critical')!.tagId;
  const res = await api(B, 'PATCH', `/api/tag/id/${tagId}`, { name: 'Critical' }, employeeToken);
  await expectStatus(res, 200);
});

test('DELETE /api/tag/id/:tagId deletes tag', async () => {
  const createRes = await api(B, 'PUT', '/api/tag', { name: 'TempTag', description: 'to delete' }, adminToken);
  const created = await createRes.json();
  const res = await api(B, 'DELETE', `/api/tag/id/${created.tagId}`, undefined, adminToken);
  await expectStatus(res, 200);
  const checkRes = await api(B, 'GET', `/api/tag/id/${created.tagId}`, undefined, adminToken);
  await expectStatus(checkRes, 404);
});

test('DELETE /api/tag/id/:tagId allows employee (employees manage tags)', async () => {
  const createRes = await api(B, 'PUT', '/api/tag', { name: 'EmpDeleteTag', description: 'employee delete check' }, employeeToken);
  const created = await createRes.json();
  const res = await api(B, 'DELETE', `/api/tag/id/${created.tagId}`, undefined, employeeToken);
  await expectStatus(res, 200);
});

test('GET /api/tags rejects unauthenticated', async () => {
  const res = await api(B, 'GET', '/api/tags');
  await expectStatus(res, 401);
});

test('GET /api/tags rejects user role', async () => {
  await createUser(B, 'taguser', 'TagUser1');
  await assignRole(B, adminToken, 'taguser', 'user');
  const user = await loginAs(B, 'taguser', 'TagUser1');
  const res = await api(B, 'GET', '/api/tags', undefined, user.token);
  await expectStatus(res, 403);
});

test('Employee can create and list tags', async () => {
  const res = await api(B, 'PUT', '/api/tag', { name: 'EmployeeTag' }, employeeToken);
  await expectStatus(res, 201);
  const listRes = await api(B, 'GET', '/api/tags', undefined, employeeToken);
  await expectStatus(listRes, 200);
});
