import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { startTestServer, stopTestServer } from './helpers/setup';
import { withAdminToken, createUser } from './helpers/api';

describe('User Management', () => {
//   beforeAll(async () => {
//     await startTestServer();
//   });

//   afterAll(async () => {
//     await stopTestServer();
//   });

//   test('Create user requires valid password', async () => {
//     const response = await fetch('http://localhost:3001/api/user/create', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ login: 'weakuser', password: '123' }),
//     });
//     expect(response.status).toBe(500);
//   });

//   test('Admin can update user role', async () => {
//     await createUser({ login: 'roleuser', password: 'Testpass123' });
    
//     await withAdminToken(async (token) => {
//       const response = await fetch('http://localhost:3001/api/user/by-login/roleuser', {
//         method: 'PATCH',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': token,
//         },
//         body: JSON.stringify({ role: 'admin' }),
//       });
//       expect(response.status).toBe(200);
//     });
//   });
});