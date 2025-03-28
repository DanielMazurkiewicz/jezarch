import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer, stopTestServer } from './helpers/setup';
import { adminCredentials, createUser, login } from './helpers/api';

describe('Authentication', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test('Admin login succeeds', async () => {
    const {token} = await login(adminCredentials);
    console.log(token)
    expect(token).toBeString();
  });

  test('Invalid password returns 401', async () => {
    const response = login({ ...adminCredentials, password: 'wrong' });
    await expect(response).rejects.toThrow('Login failed');
  });

  test('User registration and login', async () => {
    const user = { login: 'testuser', password: 'Testpass123' };
    await createUser(user);
    
    const {token} = await login(user);
    expect(token).toBeString();
  });
});