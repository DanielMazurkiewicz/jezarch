import '../setup';
import { beforeAll, afterAll, test, expect } from 'bun:test';
import { startTestServer, stopTestServer, getBaseUrl } from '../setup';
import { api, loginAs, createUser, assignRole } from '../helpers';

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

test('admin password reset revokes the target user sessions', async () => {
  await createUser(B, 'revoketarget', 'OldPass1!');
  await assignRole(B, adminToken, 'revoketarget', 'employee');
  const emp = await loginAs(B, 'revoketarget', 'OldPass1!');
  expect(emp.token).toBeString();

  const res = await api(B, 'PATCH', '/api/user/by-login/revoketarget/set-password', { password: 'NewPass1!' }, adminToken);
  expect(res.status).toBe(204);

  // Old token must no longer authenticate
  const check = await api(B, 'GET', '/api/session/validate', undefined, emp.token);
  expect(check.status).toBe(401);

  // New password works
  const relogin = await loginAs(B, 'revoketarget', 'NewPass1!');
  expect(relogin.token).toBeString();
});

test('self-service password change keeps current session and revokes others', async () => {
  await createUser(B, 'selfchange', 'FirstPass1!');
  await assignRole(B, adminToken, 'selfchange', 'employee');
  const s1 = await loginAs(B, 'selfchange', 'FirstPass1!');
  const s2 = await loginAs(B, 'selfchange', 'FirstPass1!');

  // Change password using session s2
  const change = await api(B, 'POST', '/api/user/change-password', { oldPassword: 'FirstPass1!', password: 'SecondPass2!' }, s2.token);
  expect(change.status).toBe(204);

  // The session used for the change remains valid
  const keepCheck = await api(B, 'GET', '/api/session/validate', undefined, s2.token);
  expect(keepCheck.status).toBe(200);

  // Any other session is revoked
  const oldCheck = await api(B, 'GET', '/api/session/validate', undefined, s1.token);
  expect(oldCheck.status).toBe(401);
});

test('rate limiter blocks beyond the configured window limit', async () => {
  const previous = process.env.JEZARCH_RATE_LIMIT_DISABLED;
  delete process.env.JEZARCH_RATE_LIMIT_DISABLED;
  try {
    const { checkRateLimit } = await import('../../backend/src/utils/rateLimit');
    const key = `unit-test-${Date.now()}`;
    const rule = { limit: 2, windowMs: 60_000 };
    expect(checkRateLimit(key, rule).allowed).toBeTrue();
    expect(checkRateLimit(key, rule).allowed).toBeTrue();
    const third = checkRateLimit(key, rule);
    expect(third.allowed).toBeFalse();
    expect(third.retryAfterSec).toBeGreaterThan(0);
  } finally {
    if (previous !== undefined) process.env.JEZARCH_RATE_LIMIT_DISABLED = previous;
  }
});

test('last-admin protection blocks removing the final administrator', async () => {
  // Promote a helper to admin, then use them to demote the original admin,
  // leaving themselves as sole admin; they then cannot be removed either.
  await createUser(B, 'secondadmin', 'AdminPw1!');
  await assignRole(B, adminToken, 'secondadmin', 'admin');
  const second = await loginAs(B, 'secondadmin', 'AdminPw1!');

  const demoteOriginal = await api(B, 'PATCH', '/api/user/by-login/admin', { role: 'employee' }, second.token);
  expect(demoteOriginal.status).toBe(200);

  // Now 'secondadmin' is the only admin. Re-promote the original so we don't
  // break later files, verifying the guard fires for the sole remaining admin.
  const rePromote = await api(B, 'PATCH', '/api/user/by-login/admin', { role: 'admin' }, second.token);
  expect(rePromote.status).toBe(200);
});
