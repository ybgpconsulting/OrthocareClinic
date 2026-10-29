import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSmokeTest } from './smoke-test.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerCli = path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'orthocare-pages-check-'));
const databaseDirectory = path.join(temporaryDirectory, 'd1');
const databaseName = 'orthocareclinic';
const adminPassword = `CI-only-${randomUUID()}-Aa9!`;
let pagesProcess;

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [wranglerCli, ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Wrangler exited with code ${code}.`));
    });
  });
}

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForPages(url) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (pagesProcess.exitCode !== null) {
      throw new Error(`Pages dev exited early with code ${pagesProcess.exitCode}.`);
    }
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw new Error('Pages dev did not become ready within 60 seconds.');
}

async function waitForProcessExit(process, timeoutMs) {
  if (process.exitCode !== null || process.signalCode !== null) return true;
  return Promise.race([
    new Promise((resolve) => process.once('exit', () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

async function removeTemporaryDirectory() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rm(temporaryDirectory, { recursive: true, force: true });
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM', 'ENOTEMPTY'].includes(error.code) || attempt === 11) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

try {
  await runWrangler([
    'd1', 'migrations', 'apply', databaseName,
    '--local', '--persist-to', databaseDirectory,
  ]);

  const port = await getAvailablePort();
  pagesProcess = spawn(process.execPath, [
    wranglerCli, 'pages', 'dev', 'dist',
    '--ip', '127.0.0.1',
    '--port', String(port),
    '--persist-to', databaseDirectory,
    '--binding', `ADMIN_INITIAL_PASSWORD=${adminPassword}`,
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });

  await waitForPages(`http://127.0.0.1:${port}`);
  await runSmokeTest(`http://127.0.0.1:${port}`);
  console.log('PASS local Pages Functions and isolated D1 integration');
} finally {
  if (pagesProcess && pagesProcess.exitCode === null && pagesProcess.signalCode === null) {
    pagesProcess.kill('SIGTERM');
    if (!(await waitForProcessExit(pagesProcess, 5000))) {
      pagesProcess.kill('SIGKILL');
      if (!(await waitForProcessExit(pagesProcess, 5000))) {
        throw new Error('Could not stop the temporary Pages dev process.');
      }
    }
  }
  await removeTemporaryDirectory();
}
