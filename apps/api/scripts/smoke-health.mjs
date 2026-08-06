/**
 * Bounded smoke check for the built API.
 *
 * Starts `node dist/main.js` on an ephemeral port with local-only
 * configuration, polls GET /api/health until it responds or the
 * deadline expires, and always terminates the child process.
 * No Firebase or Google network calls are made.
 */
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entrypoint = path.join(apiRoot, 'dist', 'main.js');
const deadlineMs = Number(process.env.SMOKE_DEADLINE_MS ?? 30000);
const pollIntervalMs = 500;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function smokeEnvironment(port) {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'development',
    CORS_ORIGIN: 'http://localhost:4321',
    ALLOWED_DOMAIN: '',
    FIREBASE_PROJECT_ID: 'ijac-smoke-test',
    FIREBASE_CLIENT_EMAIL: 'smoke@ijac-smoke-test.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: privateKey,
    GOOGLE_CLIENT_ID: 'smoke-client-id',
    GOOGLE_CLIENT_SECRET: 'smoke-client-secret',
    GOOGLE_REDIRECT_URI: `http://127.0.0.1:${port}/api/calendar/connection/oauth/callback`,
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32).toString('base64'),
  };
}

async function waitForHealth(port, child, getOutput) {
  const url = `http://127.0.0.1:${port}/api/health`;
  const deadline = Date.now() + deadlineMs;
  let lastError = 'no attempt made';

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`API exited early with code ${child.exitCode}:\n${getOutput()}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'ok' && !Number.isNaN(Date.parse(body.timestamp))) {
          return body;
        }
        lastError = `unexpected body: ${JSON.stringify(body)}`;
      } else {
        lastError = `HTTP ${response.status}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`health check did not pass within ${deadlineMs}ms (last: ${lastError})`);
}

async function main() {
  const port = await getFreePort();
  const child = spawn(process.execPath, [entrypoint], {
    cwd: apiRoot,
    env: smokeEnvironment(port),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));

  try {
    const body = await waitForHealth(port, child, () => output);
    console.log(`Smoke check passed: GET /api/health on port ${port} ->`, body);
  } finally {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => child.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
    if (child.exitCode === null) {
      child.kill('SIGKILL');
    }
  }
}

main().catch((error) => {
  console.error('Smoke check failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
