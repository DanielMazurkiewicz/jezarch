import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs } from '../helpers';

let B: string;
let adminToken: string;

let componentId: number;
// Elements created in this order, so "creation" order != alphabetical order.
// { name: element id }
let charlieId: number;
let alphaId: number;
let bravoId: number;

const elementIndex = async (elementId: number): Promise<string | null> => {
  const res = await api(B, 'GET', `/api/signature/element/${elementId}`, undefined, adminToken);
  await expectStatus(res, 200);
  return (await res.json()).index;
};

const createElement = async (name: string): Promise<number> => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: componentId, name }, adminToken);
  await expectStatus(res, 201);
  return (await res.json()).signatureElementId;
};

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  adminToken = (await loginAs(B, 'admin', 'admin')).token;

  const component = await (
    await api(B, 'PUT', '/api/signature/component', { name: 'Reindex Suite', index_type: 'dec' }, adminToken)
  ).json();
  componentId = component.signatureComponentId;

  // Deliberately not in alphabetical order
  charlieId = await createElement('Charlie');
  alphaId = await createElement('Alpha');
  bravoId = await createElement('Bravo');
});

afterAll(async () => {
  await stopTestServer();
});

test('reindex defaults to alphabetical order when no body is sent', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, undefined, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).finalCount).toBe(3);

  expect(await elementIndex(alphaId)).toBe('1');
  expect(await elementIndex(bravoId)).toBe('2');
  expect(await elementIndex(charlieId)).toBe('3');
});

test('reindex with orderBy "alphabetical" is explicit and matches the default', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'alphabetical' }, adminToken);
  await expectStatus(res, 200);

  expect(await elementIndex(alphaId)).toBe('1');
  expect(await elementIndex(bravoId)).toBe('2');
  expect(await elementIndex(charlieId)).toBe('3');
});

test('reindex with orderBy "creation" numbers elements in insertion order', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'creation' }, adminToken);
  await expectStatus(res, 200);

  expect(await elementIndex(charlieId)).toBe('1');
  expect(await elementIndex(alphaId)).toBe('2');
  expect(await elementIndex(bravoId)).toBe('3');
});

test('reindex with reverse flips the alphabetical order', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'alphabetical', reverse: true }, adminToken);
  await expectStatus(res, 200);

  expect(await elementIndex(charlieId)).toBe('1');
  expect(await elementIndex(bravoId)).toBe('2');
  expect(await elementIndex(alphaId)).toBe('3');
});

test('reindex with reverse flips the creation order', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'creation', reverse: true }, adminToken);
  await expectStatus(res, 200);

  expect(await elementIndex(bravoId)).toBe('1');
  expect(await elementIndex(alphaId)).toBe('2');
  expect(await elementIndex(charlieId)).toBe('3');
});

test('reindex honours the component index format when reversing', async () => {
  await api(B, 'PATCH', `/api/signature/component/${componentId}`, { index_type: 'roman' }, adminToken);

  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'alphabetical', reverse: true }, adminToken);
  await expectStatus(res, 200);

  expect(await elementIndex(charlieId)).toBe('I');
  expect(await elementIndex(bravoId)).toBe('II');
  expect(await elementIndex(alphaId)).toBe('III');

  await api(B, 'PATCH', `/api/signature/component/${componentId}`, { index_type: 'dec' }, adminToken);
});

test('reindex refreshes the component element count', async () => {
  const before = (await (await api(B, 'GET', `/api/signature/component/${componentId}`, undefined, adminToken)).json()).index_count;
  expect(before).toBe(3);

  const extra = await createElement('Delta');
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'alphabetical' }, adminToken);
  await expectStatus(res, 200);
  expect((await res.json()).finalCount).toBe(4);

  const after = (await (await api(B, 'GET', `/api/signature/component/${componentId}`, undefined, adminToken)).json()).index_count;
  expect(after).toBe(4);

  // Alpha sorts first, so Delta becomes the last index
  expect(await elementIndex(alphaId)).toBe('1');
  expect(await elementIndex(extra)).toBe('4');
});

test('reindex rejects an unknown orderBy', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'by-vibes' }, adminToken);
  await expectStatus(res, 400);
});

test('reindex rejects a non-boolean reverse', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { reverse: 'yes' }, adminToken);
  await expectStatus(res, 400);
});

test('reindex still returns 404 for an unknown component', async () => {
  const res = await api(B, 'POST', '/api/signature/components/id/999999/reindex', { orderBy: 'creation' }, adminToken);
  await expectStatus(res, 404);
});

test('reindex requires authentication', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${componentId}/reindex`, { orderBy: 'creation' });
  await expectStatus(res, 401);
});
