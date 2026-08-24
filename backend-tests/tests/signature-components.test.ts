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

  await createUser(B, 'sigcompemp', 'SigComE1');
  await assignRole(B, adminToken, 'sigcompemp', 'employee');
  const emp = await loginAs(B, 'sigcompemp', 'SigComE1');
  employeeToken = emp.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('PUT /api/signature/component creates a component', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'Series', description: 'A series', index_type: 'dec' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  expect(body.name).toBe('Series');
  expect(body.index_type).toBe('dec');
  expect(body.index_count).toBe(0);
});

test('PUT /api/signature/component with roman index type', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'Roman Series', index_type: 'roman' }, adminToken);
  await expectStatus(res, 201);
  expect((await res.json()).index_type).toBe('roman');
});

test('PUT /api/signature/component rejects duplicate name', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'Series' }, adminToken);
  await expectStatus(res, 409);
});

test('GET /api/signature/components lists components', async () => {
  const res = await api(B, 'GET', '/api/signature/components', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.some((c: any) => c.name === 'Series')).toBeTrue();
});

test('GET /api/signature/component/:id returns single component', async () => {
  const list = await (await api(B, 'GET', '/api/signature/components', undefined, adminToken)).json();
  const id = list.find((c: any) => c.name === 'Series')!.signatureComponentId;
  const res = await api(B, 'GET', `/api/signature/component/${id}`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Series');
});

test('PATCH /api/signature/component/:id updates component', async () => {
  const list = await (await api(B, 'GET', '/api/signature/components', undefined, adminToken)).json();
  const id = list.find((c: any) => c.name === 'Series')!.signatureComponentId;
  const res = await api(B, 'PATCH', `/api/signature/component/${id}`, { name: 'Updated Series', index_type: 'roman' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Updated Series');
});

test('DELETE /api/signature/component/:id deletes component', async () => {
  const created = await (await api(B, 'PUT', '/api/signature/component', { name: 'TempComp' }, adminToken)).json();
  const res = await api(B, 'DELETE', `/api/signature/component/${created.signatureComponentId}`, undefined, adminToken);
  await expectStatus(res, 204);
  const checkRes = await api(B, 'GET', `/api/signature/component/${created.signatureComponentId}`, undefined, adminToken);
  await expectStatus(checkRes, 404);
});

test('DELETE /api/signature/component/:id rejects employee', async () => {
  const list = await (await api(B, 'GET', '/api/signature/components', undefined, adminToken)).json();
  const id = list.find((c: any) => c.name === 'Updated Series')!.signatureComponentId;
  const res = await api(B, 'DELETE', `/api/signature/component/${id}`, undefined, employeeToken);
  await expectStatus(res, 403);
});

test('POST /api/signature/components/id/:id/reindex reindexes elements', async () => {
  const list = await (await api(B, 'GET', '/api/signature/components', undefined, adminToken)).json();
  const id = list.find((c: any) => c.name === 'Updated Series')!.signatureComponentId;
  const res = await api(B, 'POST', `/api/signature/components/id/${id}/reindex`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).message).toContain('re-indexed');
});

test('POST /api/signature/components/id/:id/reindex allows employee', async () => {
  const list = await (await api(B, 'GET', '/api/signature/components', undefined, adminToken)).json();
  const id = list.find((c: any) => c.name === 'Updated Series')!.signatureComponentId;
  const res = await api(B, 'POST', `/api/signature/components/id/${id}/reindex`, undefined, employeeToken);
  await expectStatus(res, 200);
});

test('Employee can create components', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'Employee Series' }, employeeToken);
  await expectStatus(res, 201);
});

test('Components require authentication', async () => {
  const res = await api(B, 'GET', '/api/signature/components');
  await expectStatus(res, 401);
});
