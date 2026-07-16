import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus } from '../helpers';

let B: string;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
});

afterAll(async () => {
  await stopTestServer();
});

test('GET /api/api/status returns 200', async () => {
  const res = await api(B, 'GET', '/api/api/status');
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.message).toBe('API is working');
});

test('GET /api/api/ping returns PONG', async () => {
  const res = await api(B, 'GET', '/api/api/ping');
  await expectStatus(res, 200);
  expect(await res.text()).toBe('PONG');
});
