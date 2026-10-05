import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs } from '../helpers';

let B: string;
let adminToken: string;

// TREE component and its elements (populated by the tests below)
let treeCompId: number;
let flatCompId: number;
let elementAId: number;
let pairedAId: number;
let elementBId: number;
let pairedBId: number;
let elementCId: number;
let pairedCId: number;
let elementDId: number;
let elementF1Id: number;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;
});

afterAll(async () => {
  await stopTestServer();
});

async function getByElementId(elementId: number): Promise<any> {
  return (await api(B, 'GET', `/api/signature/component/by-element/${elementId}`, undefined, adminToken)).json();
}

test('PUT /api/signature/component with type TREE creates a tree component', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'TR Tree Comp', type: 'TREE' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  treeCompId = body.signatureComponentId;
  expect(body.type).toBe('TREE');
});

test('PUT /api/signature/component without type defaults to FLAT', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'TR Flat Comp' }, adminToken);
  await expectStatus(res, 201);
  flatCompId = (await res.json()).signatureComponentId;
  const single = await (await api(B, 'GET', `/api/signature/component/${flatCompId}`, undefined, adminToken)).json();
  expect(single.type).toBe('FLAT');
});

test('PUT /api/signature/component rejects type ELEMENT', async () => {
  const res = await api(B, 'PUT', '/api/signature/component', { name: 'TR No Element', type: 'ELEMENT' }, adminToken);
  await expectStatus(res, 400);
});

test('element in a TREE component stores no parent elements and gets a paired ELEMENT component', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: treeCompId, name: 'Tree A' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  elementAId = body.signatureElementId;
  expect(body.parentElements).toEqual([]);

  const paired = await getByElementId(elementAId);
  pairedAId = paired.signatureComponentId;
  expect(paired.type).toBe('ELEMENT');
  expect(paired.element_id).toBe(elementAId);
  expect(paired.name).toBe('Tree A');
  expect(paired.index_type).toBe('dec');
});

test('paired ELEMENT component is hidden from the component list', async () => {
  const res = await api(B, 'GET', '/api/signature/components', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.some((c: any) => c.signatureComponentId === pairedAId)).toBeFalse();
  expect(body.some((c: any) => c.name === 'Tree A')).toBeFalse();
});

test('element created in an ELEMENT component gets the mirrored element as parent', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: pairedAId, name: 'Tree B', index: '9' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  elementBId = body.signatureElementId;
  expect(body.parentElements.map((p: any) => p.signatureElementId)).toEqual([elementAId]);

  const paired = await getByElementId(elementBId);
  pairedBId = paired.signatureComponentId;
  expect(paired.type).toBe('ELEMENT');
  expect(paired.element_id).toBe(elementBId);
});

test('nested element in a grandchild ELEMENT component chains parents correctly', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: pairedBId, name: 'Tree C' }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  elementCId = body.signatureElementId;
  expect(body.parentElements.map((p: any) => p.signatureElementId)).toEqual([elementBId]);

  const paired = await getByElementId(elementCId);
  pairedCId = paired.signatureComponentId;
  expect(paired.type).toBe('ELEMENT');
});

test('requested parentIds are ignored for elements in a TREE component', async () => {
  const res = await api(B, 'PUT', '/api/signature/element', { signatureComponentId: treeCompId, name: 'Tree D', parentIds: [elementAId] }, adminToken);
  await expectStatus(res, 201);
  const body = await res.json();
  elementDId = body.signatureElementId;
  expect(body.parentElements).toEqual([]);
});

test('FLAT components keep the legacy parent behavior', async () => {
  const f1 = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: flatCompId, name: 'Flat F1' }, adminToken)).json();
  elementF1Id = f1.signatureElementId;

  const f2 = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: flatCompId, name: 'Flat F2', parentIds: [elementF1Id] }, adminToken)).json();
  expect(f2.parentElements.map((p: any) => p.signatureElementId)).toEqual([elementF1Id]);

  const res = await api(B, 'GET', `/api/signature/component/by-element/${elementF1Id}`, undefined, adminToken);
  await expectStatus(res, 404);
});

test('children of an ELEMENT component use the paired component index format', async () => {
  // Point the paired component of C at capital_char, then add a child under C.
  const updateRes = await api(B, 'PATCH', `/api/signature/element/${elementCId}`, { index_type: 'capital_char' }, adminToken);
  await expectStatus(updateRes, 200);

  const pairedC = await getByElementId(elementCId);
  expect(pairedC.index_type).toBe('capital_char');

  const child = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: pairedCId, name: 'Tree C1' }, adminToken)).json();
  expect(child.index).toBe('A');
  expect(child.parentElements.map((p: any) => p.signatureElementId)).toEqual([elementCId]);
});

test('PATCH /api/signature/element syncs name and index_type to the paired component', async () => {
  const res = await api(B, 'PATCH', `/api/signature/element/${elementCId}`, { name: 'Tree C renamed' }, adminToken);
  await expectStatus(res, 200);

  const paired = await getByElementId(elementCId);
  expect(paired.name).toBe('Tree C renamed');
  expect(paired.index_type).toBe('capital_char'); // unchanged when not provided
});

test('reindexing a paired ELEMENT component rewrites child indices', async () => {
  const res = await api(B, 'POST', `/api/signature/components/id/${pairedAId}/reindex`, undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.finalCount).toBe(1);

  const b = await (await api(B, 'GET', `/api/signature/element/${elementBId}`, undefined, adminToken)).json();
  expect(b.index).toBe('1'); // was '9' before reindexing
});

test('deleting a tree element cascades through its whole subtree and paired components', async () => {
  const res = await api(B, 'DELETE', `/api/signature/element/${elementAId}`, undefined, adminToken);
  await expectStatus(res, 204);

  for (const id of [elementAId, elementBId, elementCId]) {
    const elRes = await api(B, 'GET', `/api/signature/element/${id}`, undefined, adminToken);
    await expectStatus(elRes, 404);
  }
  for (const id of [pairedAId, pairedBId, pairedCId]) {
    const compRes = await api(B, 'GET', `/api/signature/component/${id}`, undefined, adminToken);
    await expectStatus(compRes, 404);
  }
});

test('deleting a TREE component deletes its elements, their subtrees and paired components', async () => {
  const res = await api(B, 'DELETE', `/api/signature/component/${treeCompId}`, undefined, adminToken);
  await expectStatus(res, 204);

  // D was the only remaining element of the tree component.
  const dRes = await api(B, 'GET', `/api/signature/element/${elementDId}`, undefined, adminToken);
  await expectStatus(dRes, 404);
  const pairedDRes = await api(B, 'GET', `/api/signature/component/by-element/${elementDId}`, undefined, adminToken);
  await expectStatus(pairedDRes, 404);
  const compRes = await api(B, 'GET', `/api/signature/component/${treeCompId}`, undefined, adminToken);
  await expectStatus(compRes, 404);
});

test('deleting an ELEMENT component directly deletes its mirrored element and subtree', async () => {
  const t2 = await (await api(B, 'PUT', '/api/signature/component', { name: 'TR Second Tree', type: 'TREE' }, adminToken)).json();
  const e1 = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: t2.signatureComponentId, name: 'Second E1' }, adminToken)).json();
  const pairedE1 = await getByElementId(e1.signatureElementId);
  const e2 = await (await api(B, 'PUT', '/api/signature/element', { signatureComponentId: pairedE1.signatureComponentId, name: 'Second E2' }, adminToken)).json();

  const res = await api(B, 'DELETE', `/api/signature/component/${pairedE1.signatureComponentId}`, undefined, adminToken);
  await expectStatus(res, 204);

  for (const id of [e1.signatureElementId, e2.signatureElementId]) {
    const elRes = await api(B, 'GET', `/api/signature/element/${id}`, undefined, adminToken);
    await expectStatus(elRes, 404);
  }
});
