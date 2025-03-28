import { testPort } from "./setup";

const API_BASE = 'http://localhost:' + testPort;

export async function login(credentials: { login: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) throw new Error('Login failed');
  return (await response.json()) as {token: string, message: string};
}

export const adminCredentials = { login: 'admin', password: 'admin' };

export async function withAdminToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const {token} = await login(adminCredentials) as { token: string };
  return fn(token);
}

export async function createUser(user: { login: string; password: string }) {
  const response = await fetch(`${API_BASE}/api/user/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!response.ok) throw new Error('User creation failed');
}