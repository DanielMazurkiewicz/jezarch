import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer, stopTestServer } from './helpers/setup';
import { withAdminToken, createUser, login } from './helpers/api';

describe('Note Management', () => {
  beforeAll(async () => {
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
  });

  test('Create and retrieve note', async () => {
    const user = { login: 'noteuser', password: 'Testpass123' };
    await createUser(user);
    const { token } = await login(user);

    // Create note
    const createResponse = await fetch('http://localhost:3001/api/note', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({
        title: 'My Note',
        content: 'Secret Content',
        shared: false
      }),
    });
    expect(createResponse.status).toBe(201);
    
    // Retrieve note
    //@ts-ignore
    const noteId = (await createResponse.json()).noteId;
    const getResponse = await fetch(`http://localhost:3001/api/note/id/${noteId}`, {
      headers: { 'Authorization': token },
    });
    expect(getResponse.status).toBe(200);
  });
});