import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, expectStatus, loginAs, createUser, assignRole } from '../helpers';

let B: string;
let adminToken: string;

beforeAll(async () => {
  await startTestServer();
  B = getBaseUrl();
  const admin = await loginAs(B, 'admin', 'admin');
  adminToken = admin.token;
});

afterAll(async () => {
  await stopTestServer();
});

test('POST /api/user/create creates a user', async () => {
  const res = await api(B, 'POST', '/api/user/create', { login: 'testuser1', password: 'TestPass123' });
  await expectStatus(res, 201);
  const body = await res.json();
  expect(body.login).toBe('testuser1');
  expect(body.role).toBeNull();
  expect(body.preferredLanguage).toBe('en');
});

test('POST /api/user/create rejects duplicate login', async () => {
  const res = await api(B, 'POST', '/api/user/create', { login: 'admin', password: 'TestPass123' });
  await expectStatus(res, 409);
});

test('POST /api/user/create rejects weak password', async () => {
  const res = await api(B, 'POST', '/api/user/create', { login: 'weakpwd', password: 'short' });
  await expectStatus(res, 400);
});

test('POST /api/user/create rejects missing fields', async () => {
  const res = await api(B, 'POST', '/api/user/create', { login: 'nopass' });
  await expectStatus(res, 400);
});

test('POST /api/user/login returns token for valid credentials', async () => {
  const res = await api(B, 'POST', '/api/user/login', { login: 'admin', password: 'admin' });
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.token).toBeString();
  expect(body.token).not.toBeEmpty();
  expect(body.login).toBe('admin');
  expect(body.role).toBe('admin');
});

test('POST /api/user/login rejects invalid password', async () => {
  const res = await api(B, 'POST', '/api/user/login', { login: 'admin', password: 'wrongpassword' });
  await expectStatus(res, 401);
});

test('POST /api/user/login rejects non-existent user', async () => {
  const res = await api(B, 'POST', '/api/user/login', { login: 'nonexistent', password: 'TestPass123' });
  await expectStatus(res, 401);
});

test('POST /api/user/logout invalidates session', async () => {
  const loginRes = await api(B, 'POST', '/api/user/login', { login: 'admin', password: 'admin' });
  const { token } = await loginRes.json();
  const logoutRes = await api(B, 'POST', '/api/user/logout', undefined, token);
  await expectStatus(logoutRes, 204);
  const usersRes = await api(B, 'GET', '/api/users/all', undefined, token);
  await expectStatus(usersRes, 401);
});

test('GET /api/users/all returns users for admin', async () => {
  const res = await api(B, 'GET', '/api/users/all', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body).toBeArray();
  expect(body.some((u: any) => u.login === 'admin')).toBeTrue();
});

test('GET /api/users/all rejects non-admin', async () => {
  await createUser(B, 'emp1', 'Employee1');
  await assignRole(B, adminToken, 'emp1', 'employee');
  const emp = await loginAs(B, 'emp1', 'Employee1');
  const res = await api(B, 'GET', '/api/users/all', undefined, emp.token);
  await expectStatus(res, 403);
});

test('GET /api/user/by-login/:login returns own user', async () => {
  const res = await api(B, 'GET', '/api/user/by-login/admin', undefined, adminToken);
  await expectStatus(res, 200);
  const body = await res.json();
  expect(body.login).toBe('admin');
  expect(body.role).toBe('admin');
});

test('GET /api/user/by-login/:login returns 404 for unknown user', async () => {
  const res = await api(B, 'GET', '/api/user/by-login/ghost', undefined, adminToken);
  await expectStatus(res, 404);
});

test('PATCH /api/user/by-login/:login updates role', async () => {
  await createUser(B, 'roleuser', 'RoleUser1');
  const res = await api(B, 'PATCH', '/api/user/by-login/roleuser', { role: 'employee' }, adminToken);
  await expectStatus(res, 200);
  const check = await loginAs(B, 'roleuser', 'RoleUser1');
  expect(check.role).toBe('employee');
});

test('PATCH /api/user/by-login/:login cannot change own role', async () => {
  const res = await api(B, 'PATCH', '/api/user/by-login/admin', { role: 'employee' }, adminToken);
  await expectStatus(res, 400);
});

test('PATCH /api/user/by-login/:login rejects invalid role', async () => {
  const res = await api(B, 'PATCH', '/api/user/by-login/admin', { role: 'superadmin' }, adminToken);
  await expectStatus(res, 400);
});

test('POST /api/user/change-password changes own password', async () => {
  await createUser(B, 'changepwd', 'ChangeMe1');
  await assignRole(B, adminToken, 'changepwd', 'employee');
  const user = await loginAs(B, 'changepwd', 'ChangeMe1');
  const res = await api(B, 'POST', '/api/user/change-password', { oldPassword: 'ChangeMe1', password: 'NewPass123' }, user.token);
  await expectStatus(res, 204);
  const relogin = await loginAs(B, 'changepwd', 'NewPass123');
  expect(relogin.role).toBe('employee');
});

test('POST /api/user/change-password rejects wrong old password', async () => {
  const res = await api(B, 'POST', '/api/user/change-password', { oldPassword: 'wrong', password: 'NewPass123' }, adminToken);
  await expectStatus(res, 401);
});

test('PATCH /api/user/by-login/:login/set-password admin sets other password', async () => {
  await createUser(B, 'setpwdusr', 'SetPwdUs1');
  await assignRole(B, adminToken, 'setpwdusr', 'employee');
  const res = await api(B, 'PATCH', '/api/user/by-login/setpwdusr/set-password', { password: 'AdminSet1' }, adminToken);
  await expectStatus(res, 204);
  const loginRes = await loginAs(B, 'setpwdusr', 'AdminSet1');
  expect(loginRes).toBeTruthy();
});

test('PATCH /api/user/by-login/:login/language updates language', async () => {
  const res = await api(B, 'PATCH', '/api/user/by-login/admin/language', { preferredLanguage: 'pl' }, adminToken);
  await expectStatus(res, 200);
  const getRes = await api(B, 'GET', '/api/user/by-login/admin', undefined, adminToken);
  const body = await getRes.json();
  expect(body.preferredLanguage).toBe('pl');
  await api(B, 'PATCH', '/api/user/by-login/admin/language', { preferredLanguage: 'en' }, adminToken);
});

test('PATCH /api/user/by-login/:login/language rejects invalid language', async () => {
  const res = await api(B, 'PATCH', '/api/user/by-login/admin/language', { preferredLanguage: 'de' }, adminToken);
  await expectStatus(res, 400);
});

test('PATCH /api/user/by-login/:login/language self-service works', async () => {
  await createUser(B, 'langself', 'LangSel1');
  await assignRole(B, adminToken, 'langself', 'user');
  const user = await loginAs(B, 'langself', 'LangSel1');
  const res = await api(B, 'PATCH', '/api/user/by-login/langself/language', { preferredLanguage: 'pl' }, user.token);
  await expectStatus(res, 200);
});

test('GET /api/user/by-login/:login/tags returns empty for non-user role', async () => {
  await createUser(B, 'tagcheck', 'TagChec1');
  await assignRole(B, adminToken, 'tagcheck', 'employee');
  const res = await api(B, 'GET', '/api/user/by-login/tagcheck/tags', undefined, adminToken);
  await expectStatus(res, 200);
  expect(await res.json()).toEqual([]);
});

test('PUT /api/user/by-login/:login/tags assigns tags to user', async () => {
  await api(B, 'PUT', '/api/tag', { name: 'usertag1', description: 'test' }, adminToken);
  const tagsRes = await api(B, 'GET', '/api/tags', undefined, adminToken);
  const tags = await tagsRes.json();
  const tagId = tags[0].tagId;
  await createUser(B, 'tagassign', 'TagAssi1');
  await assignRole(B, adminToken, 'tagassign', 'user');
  const res = await api(B, 'PUT', '/api/user/by-login/tagassign/tags', { tagIds: [tagId] }, adminToken);
  await expectStatus(res, 200);
  const assigned = await res.json();
  expect(assigned).toBeArray();
  expect(assigned.some((t: any) => t.tagId === tagId)).toBeTrue();
});

test('User endpoints require authentication', async () => {
  const res = await api(B, 'GET', '/api/users/all');
  await expectStatus(res, 401);
});

test('User endpoints reject invalid token', async () => {
  const res = await api(B, 'GET', '/api/users/all', undefined, 'invalid-token');
  await expectStatus(res, 401);
});
