import { AppParams } from '../backend/src/initialization/app_params';
import { CmdParams } from '../backend/src/initialization/cmd';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync } from 'node:fs';
import crypto from 'node:crypto';

const TEST_DB_PATH = join(tmpdir(), `jezarch-test-${crypto.randomUUID().slice(0, 8)}.sqlite`);

// Deterministic bootstrap credentials for the test-suite; production generates
// a random initial admin password instead (see user/db.ts).
process.env.JEZARCH_INITIAL_ADMIN_PASSWORD = 'admin';
// Auth endpoints are exercised heavily by the suite; disable throttling here.
process.env.JEZARCH_RATE_LIMIT_DISABLED = '1';

AppParams.dbPath = TEST_DB_PATH;
AppParams.httpPort = 0;
CmdParams.debugConsole = false;

const { initializeDatabase } = await import('../backend/src/initialization/db');
const { routes } = await import('../backend/src/initialization/routes');

let server: import('bun').Server | null = null;
let baseUrl: string = '';

// The SQLite connection is a module-level singleton shared by the whole suite.
// Deleting the DB file while later test files still use it leaves the
// connection bound to an unlinked inode (the backup endpoint then 404s).
// Files are therefore removed once, when the test process exits.
function cleanupDbFiles() {
  try { unlinkSync(TEST_DB_PATH); } catch { }
  try { unlinkSync(TEST_DB_PATH + '-wal'); } catch { }
  try { unlinkSync(TEST_DB_PATH + '-shm'); } catch { }
}
process.on('exit', cleanupDbFiles);

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
}

export function getBaseUrl(): string {
  if (!baseUrl) throw new Error('Test server not started');
  return baseUrl;
}
