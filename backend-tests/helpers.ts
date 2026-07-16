export function api(baseUrl: string, method: string, path: string, body?: unknown, token?: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = token;
  const opts: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  return fetch(`${baseUrl}${path}`, opts);
}

export async function loginAs(baseUrl: string, login: string, password: string): Promise<{ token: string; userId: number; role: string }> {
  const res = await api(baseUrl, 'POST', '/api/user/login', { login, password });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return { token: body.token, userId: body.userId, role: body.role };
}

export async function createUser(baseUrl: string, login: string, password: string, preferredLanguage = 'en'): Promise<Response> {
  return api(baseUrl, 'POST', '/api/user/create', { login, password, preferredLanguage });
}

export function assignRole(baseUrl: string, adminToken: string, login: string, role: string | null): Promise<Response> {
  return api(baseUrl, 'PATCH', `/api/user/by-login/${encodeURIComponent(login)}`, { role }, adminToken);
}

export async function expectStatus(res: Response, expected: number): Promise<void> {
  if (res.status !== expected) {
    const body = await res.text();
    throw new Error(`Expected status ${expected}, got ${res.status}. Body: ${body}`);
  }
}

export async function expectJson(res: Response): Promise<any> {
  return res.json();
}
