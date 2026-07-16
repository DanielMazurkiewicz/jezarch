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

  await createUser(B, 'logemp', 'LogEmpl1');
  await assignRole(B, adminToken, 'logemp', 'employee');
  const emp = await loginAs(B, 'logemp', 'LogEmpl1');
  employeeToken = emp.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('POST /api/logs/search returns empty search for admin', async () => {
  const res = await api(B, 'POST', '/api/logs/search', {
    query: [{ field: 'level', condition: 'EQ', value: 'info', not: false }],
    page: 1, pageSize: 10,
  }, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.data).toBeArray();
  expect(body.page).toBe(1);
});

test('POST /api/logs/search returns paginated results', async () => {
  const res = await api(B, 'POST', '/api/logs/search', { query: [], page: 1, pageSize: 5 }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).pageSize).toBe(5);
});

test('POST /api/logs/search rejects employee', async () => {
  const res = await api(B, 'POST', '/api/logs/search', { query: [], page: 1, pageSize: 10 }, employeeToken);
  await expectStatus(res, 403);
});

test('DELETE /api/logs/purge purges old logs', async () => {
  const res = await api(B, 'DELETE', '/api/logs/purge?days=1', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.deletedCount).toBeNumber();
  expect(body.message).toContain('Successfully purged');
});

test('DELETE /api/logs/purge uses default 7 days', async () => {
  const res = await api(B, 'DELETE', '/api/logs/purge', undefined, adminToken);
  await expectStatus(res, 200);
});

test('DELETE /api/logs/purge rejects employee', async () => {
  const res = await api(B, 'DELETE', '/api/logs/purge', undefined, employeeToken);
  await expectStatus(res, 403);
});

test('Logs endpoints require authentication', async () => {
  const res = await api(B, 'POST', '/api/logs/search', { query: [], page: 1, pageSize: 10 });
  await expectStatus(res, 401);
});

test('DELETE /api/logs/purge requires authentication', async () => {
  const res = await api(B, 'DELETE', '/api/logs/purge');
  await expectStatus(res, 401);
});
