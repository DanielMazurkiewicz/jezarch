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

  await createUser(B, 'adminemp', 'AdminEm1!');
  await assignRole(B, adminToken, 'adminemp', 'employee');
  const emp = await loginAs(B, 'adminemp', 'AdminEm1!');
  employeeToken = emp.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('GET /api/admin/db/backup returns database file for admin', async () => {
  const res = await api(B, 'GET', '/api/admin/db/backup', undefined, adminToken);
  await expectStatus(res, 200);
  const contentType = res.headers.get('Content-Type');
  expect(contentType).toBeString();
  const disposition = res.headers.get('Content-Disposition');
  expect(disposition).toContain('attachment');
  expect(disposition).toContain('jezarch-backup-');
  expect(disposition).toContain('.sqlite.db');
});

test('GET /api/admin/db/backup rejects employee', async () => {
  const res = await api(B, 'GET', '/api/admin/db/backup', undefined, employeeToken);
  await expectStatus(res, 403);
});

test('GET /api/admin/db/backup requires authentication', async () => {
  const res = await api(B, 'GET', '/api/admin/db/backup');
  await expectStatus(res, 401);
});
