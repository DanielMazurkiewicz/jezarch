import { AppParams } from '../backend/src/initialization/app_params';
import { CmdParams } from '../backend/src/initialization/cmd';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';
import crypto from 'node:crypto';

const TEST_DB_PATH = join(tmpdir(), `jezarch-test-${crypto.randomUUID().slice(0, 8)}.sqlite`);

AppParams.dbPath = TEST_DB_PATH;
AppParams.httpPort = 0;
CmdParams.debugConsole = false;

const { initializeDatabase } = await import('../backend/src/initialization/db');
const { routes } = await import('../backend/src/initialization/routes');

let server: import('bun').Server | null = null;
let baseUrl: string = '';

export async function startTestServer(): Promise<string> {
  if (server) return baseUrl;
  await initializeDatabase();
  server = Bun.serve({
    port: 0,
    routes: routes as any,
    fetch() { return new Response('Not Found', { status: 404 }); },
  });
  baseUrl = `http://${server.hostname}:${server.port}`;
  return baseUrl;
}

export async function stopTestServer(): Promise<void> {
  if (server) { server.stop(); server = null; }
  baseUrl = '';
  try { unlinkSync(TEST_DB_PATH); } catch { }
  try { unlinkSync(TEST_DB_PATH + '-wal'); } catch { }
  try { unlinkSync(TEST_DB_PATH + '-shm'); } catch { }
}

export function getBaseUrl(): string {
  if (!baseUrl) throw new Error('Test server not started');
  return baseUrl;
}
