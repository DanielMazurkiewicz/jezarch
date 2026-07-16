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

  await createUser(B, 'confemp', 'ConfEmpl1');
  await assignRole(B, adminToken, 'confemp', 'employee');
  const emp = await loginAs(B, 'confemp', 'ConfEmpl1');
  employeeToken = emp.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('GET /api/config/default-language returns default language (public)', async () => {
  const res = await api(B, 'GET', '/api/config/default-language');
  await expectStatus(res, 200);
  expect((await res.json()).defaultLanguage).toBeString();
});

test('GET /api/configs/:key admin can read config', async () => {
  const res = await api(B, 'GET', '/api/configs/default_language', undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).default_language).toBeString();
});

test('GET /api/configs/:key employee can read allowed keys', async () => {
  const res = await api(B, 'GET', '/api/configs/default_language', undefined, employeeToken);
  await expectStatus(res, 200);
});

test('GET /api/configs/:key employee cannot read sensitive keys', async () => {
  const res = await api(B, 'GET', '/api/configs/https_key_path', undefined, employeeToken);
  await expectStatus(res, 403);
});

test('GET /api/configs/:key returns 400 for invalid key', async () => {
  const res = await api(B, 'GET', '/api/configs/invalid_key', undefined, adminToken);
  await expectStatus(res, 400);
});

test('PUT /api/configs/:key admin can set config', async () => {
  const res = await api(B, 'PUT', '/api/configs/default_language', { key: 'default_language', value: 'pl' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).message).toContain('updated successfully');
});

test('PUT /api/configs/:key rejects invalid port', async () => {
  const res = await api(B, 'PUT', '/api/configs/http_port', { key: 'http_port', value: '999999' }, adminToken);
  await expectStatus(res, 400);
});

test('PUT /api/configs/:key rejects non-admin', async () => {
  const res = await api(B, 'PUT', '/api/configs/default_language', { key: 'default_language', value: 'en' }, employeeToken);
  await expectStatus(res, 403);
});

test('PUT /api/configs/:key validates language value', async () => {
  const res = await api(B, 'PUT', '/api/configs/default_language', { key: 'default_language', value: 'de' }, adminToken);
  await expectStatus(res, 400);
});

test('DELETE /api/config/https clears HTTPS config', async () => {
  const res = await api(B, 'DELETE', '/api/config/https', undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).message).toBeString();
});

test('DELETE /api/config/https rejects non-admin', async () => {
  const res = await api(B, 'DELETE', '/api/config/https', undefined, employeeToken);
  await expectStatus(res, 403);
});

test('Config endpoints require authentication', async () => {
  const res = await api(B, 'GET', '/api/configs/default_language');
  await expectStatus(res, 401);
});
