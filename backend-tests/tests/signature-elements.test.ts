import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let employeeToken: string;
let componentId: number;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;

  await createUser(B, 'selemp', 'SelEmpl1');
  await assignRole(B, adminToken, 'selemp', 'employee');
  const emp = await loginAs(B, 'selemp', 'SelEmpl1');
  employeeToken = emp.token;

  const compRes = await api(B, 'PUT', '/api/signature/component', { name: 'Element Test Comp', index_type: 'dec' }, adminToken);
  componentId = (await compRes.json()).signatureComponentId;
});

afterAll(async () => {
  await stopTestServer();
});

test('PUT /api/signature/element creates an element', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Element A', description: 'First element' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  expect(body.name).toBe('Element A');
  expect(body.signatureComponentId).toBe(componentId);
});

test('PUT /api/signature/element with custom index', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Element B', index: 'custom-1' }, adminToken);
  await expectStatus(res, 201);
  expect((await res.json()).index).toBe('custom-1');
});

test('PUT /api/signature/element with parents', async () => {
  const elements = await (await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`, undefined, adminToken)).json();
  const parentIds = elements.map((e: any) => e.signatureElementId);
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Element C (child)', parentIds }, adminToken);
  await expectStatus(res, 201);
  expect((await res.json()).parentElements).toBeArray();
});

test('GET /api/signature/components/id/:componentId/elements/all lists elements', async () => {
  const res = await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`, undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.length).toBeGreaterThanOrEqual(3);
});

test('GET /api/signature/element/:id returns element', async () => {
  const elements = await (await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`, undefined, adminToken)).json();
  const id = elements.find((e: any) => e.name === 'Element A')!.signatureElementId;
  const res = await api(B, 'GET', `/api/signature/element/${id}`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Element A');
});

test('GET /api/signature/element/:id with populate query', async () => {
  const elements = await (await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`, undefined, adminToken)).json();
  const id = elements.find((e: any) => e.name === 'Element C (child)')!.signatureElementId;
  const res = await api(B, 'GET', `/api/signature/element/${id}?populate=component,parents`, undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.component).toBeDefined();
  expect(body.parentElements).toBeArray();
});

test('PATCH /api/signature/element/:id updates element', async () => {
  const elements = await (await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`, undefined, adminToken)).json();
  const id = elements.find((e: any) => e.name === 'Element A')!.signatureElementId;
  const res = await api(B, 'PATCH', `/api/signature/element/${id}`, { name: 'Element A Updated', index: '99' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).name).toBe('Element A Updated');
});

test('DELETE /api/signature/element/:id deletes element', async () => {
  const created = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Temp Element' }, adminToken)).json();
  const res = await api(B, 'DELETE', `/api/signature/element/${created.signatureElementId}`, undefined, adminToken);
  await expectStatus(res, 204);
  const checkRes = await api(B, 'GET', `/api/signature/element/${created.signatureElementId}`, undefined, adminToken);
  await expectStatus(checkRes, 404);
});

test('Employee can create elements', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name: 'Employee Element' }, employeeToken);
  await expectStatus(res, 201);
});

test('POST /api/signature/elements/search searches elements', async () => {
  const res = await api(B, 'POST', '/api/signature/elements/search', {
    query: [{ field: 'name', condition: 'FRAGMENT', value: 'Element', not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.data).toBeArray();
  expect(body.totalSize).toBeGreaterThanOrEqual(1);
});

test('POST /api/signature/elements/search by component name', async () => {
  const res = await api(B, 'POST', '/api/signature/elements/search', {
    query: [{ field: 'componentName', condition: 'FRAGMENT', value: 'Test Comp', not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).data.length).toBeGreaterThanOrEqual(1);
});

test('Elements endpoints require authentication', async () => {
  const res = await api(B, 'GET', `/api/signature/components/id/${componentId}/elements/all`);
  await expectStatus(res, 401);
});
