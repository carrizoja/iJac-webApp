/**
 * Builds and exercises the API container with synthetic local-only configuration.
 * Firebase and Google APIs are never called; only the public health route is probed.
 */
import { execFile, spawn } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const suffix = randomUUID().slice(0, 8);
const image = `ijac-api-smoke:${suffix}`;
const container = `ijac-api-smoke-${suffix}`;
const deadlineMs = Number(process.env.CONTAINER_SMOKE_DEADLINE_MS ?? 120000);

async function docker(...args) {
  return execFileAsync('docker', args, { cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 });
}

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

function syntheticEnvironment() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return [
    'NODE_ENV=production',
    'PORT=8080',
    'CORS_ORIGIN=http://localhost:4321',
    'WEB_APP_URL=http://localhost:4321',
    'ALLOWED_DOMAIN=',
    'FIREBASE_PROJECT_ID=ijac-container-smoke',
    'FIREBASE_CLIENT_EMAIL=smoke@ijac-container-smoke.iam.gserviceaccount.com',
    `FIREBASE_PRIVATE_KEY=${privateKey.replace(/\n/g, '\\n')}`,
    'GOOGLE_CLIENT_ID=smoke-client-id',
    'GOOGLE_CLIENT_SECRET=smoke-client-secret',
    'GOOGLE_REDIRECT_URI=http://localhost:8080/api/calendar/connection/oauth/callback',
    `CREDENTIAL_ENCRYPTION_KEY=${Buffer.alloc(32).toString('base64')}`,
    'REPOSITORY_MODE=global',
    '',
  ].join('\n');
}

async function waitForHealth(port) {
  const deadline = Date.now() + deadlineMs;
  let lastError = 'no attempt made';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      const body = await response.json();
      if (response.ok && body.status === 'ok' && !Number.isNaN(Date.parse(body.timestamp))) {
        return body;
      }
      lastError = `HTTP ${response.status}: ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`container health check timed out (last: ${lastError})`);
}

async function main() {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ijac-api-smoke-'));
  const environmentFile = path.join(temporaryDirectory, 'container.env');
  const hostPort = await getFreePort();

  try {
    await writeFile(environmentFile, syntheticEnvironment(), { mode: 0o600 });
    console.log(`Building ${image}...`);
    await docker('build', '--file', 'apps/api/Dockerfile', '--tag', image, '.');
    await docker(
      'run',
      '--detach',
      '--name',
      container,
      '--env-file',
      environmentFile,
      '--publish',
      `127.0.0.1:${hostPort}:8080`,
      image,
    );

    const body = await waitForHealth(hostPort);
    await docker('stop', '--time', '5', container);
    const { stdout } = await docker('inspect', '--format', '{{.State.ExitCode}}', container);
    if (stdout.trim() !== '0') {
      throw new Error(`container exited with code ${stdout.trim()} after SIGTERM`);
    }
    console.log(`Container smoke passed: GET /api/health -> ${JSON.stringify(body)}; SIGTERM -> 0`);
  } catch (error) {
    try {
      const { stdout, stderr } = await docker('logs', container);
      process.stderr.write(`${stdout}${stderr}`);
    } catch {
      // The container may not exist if the build failed.
    }
    throw error;
  } finally {
    await docker('rm', '--force', container).catch(() => undefined);
    await docker('image', 'rm', '--force', image).catch(() => undefined);
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const availability = spawn('docker', ['info'], { stdio: 'ignore' });
availability.once('error', () => {
  console.error('Container smoke failed: Docker is not installed or not executable');
  process.exitCode = 1;
});
availability.once('exit', (code) => {
  if (code !== 0) {
    console.error('Container smoke failed: Docker daemon is unavailable');
    process.exitCode = 1;
    return;
  }
  main().catch((error) => {
    console.error('Container smoke failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
});
