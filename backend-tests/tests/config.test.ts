import { beforeAll, afterAll, test, expect, describe } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;
let employeeToken: string;
let userToken: string;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;

  await createUser(B, 'confemp', 'ConfEmpl1');
  await assignRole(B, adminToken, 'confemp', 'employee');
  const emp = await loginAs(B, 'confemp', 'ConfEmpl1');
  employeeToken = emp.token;

  await createUser(B, 'confusr', 'ConfUsr1');
  await assignRole(B, adminToken, 'confusr', 'user');
  const usr = await loginAs(B, 'confusr', 'ConfUsr1');
  userToken = usr.token;
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

describe('hidden_ui_elements', () => {
  const key = 'hidden_ui_elements';

  const reset = async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: '[]' }, adminToken);
    await expectStatus(res, 200);
  };

  test('GET returns a JSON array', async () => {
    const res = await api(B, 'GET', `/api/configs/${key}`, undefined, adminToken);
    await expectStatus(res, 200);
    expect(Array.isArray((await res.json())[key])).toBe(true);
  });

  test('employee can read it', async () => {
    const res = await api(B, 'GET', `/api/configs/${key}`, undefined, employeeToken);
    await expectStatus(res, 200);
  });

  test('user role can read it too — /archive is reachable by every role', async () => {
    const res = await api(B, 'GET', `/api/configs/${key}`, undefined, userToken);
    await expectStatus(res, 200);
    expect(Array.isArray((await res.json())[key])).toBe(true);
  });

  test('it is one global value, identical for every role', async () => {
    await api(B, 'PUT', `/api/configs/${key}`, { key, value: '["archive.tab.units"]' }, adminToken);
    const bodies = await Promise.all(
      [adminToken, employeeToken, userToken].map(async token => {
        const res = await api(B, 'GET', `/api/configs/${key}`, undefined, token);
        return (await res.json())[key];
      }),
    );
    expect(bodies[0]).toEqual(['archive.tab.units']);
    expect(bodies[1]).toEqual(bodies[0]);
    expect(bodies[2]).toEqual(bodies[0]);
    await reset();
  });

  test('anonymous access is still denied', async () => {
    const res = await api(B, 'GET', `/api/configs/${key}`);
    await expectStatus(res, 401);
  });

  test('admin can hide elements and read them back', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, {
      key,
      value: '["signatures.newTreeButton","archive.tab.mainDocs"]',
    }, adminToken);
    await expectStatus(res, 200);

    const read = await api(B, 'GET', `/api/configs/${key}`, undefined, employeeToken);
    await expectStatus(read, 200);
    expect((await read.json())[key]).toEqual(['signatures.newTreeButton', 'archive.tab.mainDocs']);

    await reset();
  });

  test('deduplicates on write', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, {
      key,
      value: '["signatures.newTreeButton","signatures.newTreeButton"]',
    }, adminToken);
    await expectStatus(res, 200);

    const read = await api(B, 'GET', `/api/configs/${key}`, undefined, adminToken);
    expect((await read.json())[key]).toEqual(['signatures.newTreeButton']);

    await reset();
  });

  test('rejects an unknown element id', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: '["signatures.nope"]' }, adminToken);
    await expectStatus(res, 400);
  });

  test('rejects a non-array JSON value', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: '{"a":1}' }, adminToken);
    await expectStatus(res, 400);
  });

  test('rejects malformed JSON', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: 'not json' }, adminToken);
    await expectStatus(res, 400);
  });

  test('rejects a null value', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: null }, adminToken);
    await expectStatus(res, 400);
  });

  test('rejects non-admin', async () => {
    const res = await api(B, 'PUT', `/api/configs/${key}`, { key, value: '["archive.tab.mainDocs"]' }, employeeToken);
    await expectStatus(res, 403);
  });
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
