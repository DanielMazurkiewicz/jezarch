import { spawn } from 'bun';
import { $ } from 'bun';

let serverProcess: ReturnType<typeof spawn> | null = null;
export const testPort = 11111;
const testDbPath = 'test.db';

export async function startTestServer() {
  if (serverProcess) return;

  // Clean previous test database
  await $`rm -f ${testDbPath}`;

  // Start server with test parameters
  //@ts-ignore
  serverProcess = spawn({
    cmd: ['bun', 'run', 'backend-tests/src/main.ts', '--port', testPort.toString(), '--db-path', testDbPath],
    stdout: 'pipe',
    stderr: 'pipe',
  });

  // Wait for server readiness
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:${testPort}/api/api/status`);
      if (response.ok) {
        console.log("Connected")
        return;
      }
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Test server failed to start');
}

export async function stopTestServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    // await $`rm -f ${testDbPath}`;
  }
}