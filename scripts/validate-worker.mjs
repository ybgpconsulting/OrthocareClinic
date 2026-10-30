import { spawn } from 'node:child_process';
import { pbkdf2Sync, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSmokeTest } from './smoke-test.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerCli = path.join(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'orthocare-worker-check-'));
const databaseDirectory = path.join(temporaryDirectory, 'd1');
const databaseName = 'orthocareclinic';
const adminPassword = `CI-only-${randomUUID()}-Aa9!`;
const rotatedPassword = `Rotated-${randomUUID()}-LocalTest!`;
const pageSize = 20;
let workerProcess;

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

async function waitForWorker(url, expectedHealthStatus = 200) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (workerProcess.exitCode !== null) {
      throw new Error(`Worker dev exited early with code ${workerProcess.exitCode}.`);
    }
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.status === expectedHealthStatus) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  throw new Error('Worker dev did not become ready within 60 seconds.');
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

async function startWorker(databasePath, expectedHealthStatus = 200) {
  const port = await getAvailablePort();
  workerProcess = spawn(process.execPath, [
    wranglerCli, 'dev', '--local',
    '--ip', '127.0.0.1',
    '--port', String(port),
    '--persist-to', databasePath,
    '--var', `ADMIN_INITIAL_PASSWORD:${adminPassword}`,
  ], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForWorker(baseUrl, expectedHealthStatus);
  return baseUrl;
}

async function stopWorker() {
  if (!workerProcess || workerProcess.exitCode !== null || workerProcess.signalCode !== null) {
    workerProcess = undefined;
    return;
  }
  workerProcess.kill('SIGTERM');
  if (!(await waitForProcessExit(workerProcess, 5000))) {
    workerProcess.kill('SIGKILL');
    if (!(await waitForProcessExit(workerProcess, 5000))) {
      throw new Error('Could not stop the temporary Worker dev process.');
    }
  }
  workerProcess = undefined;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertStatus(response, expectedStatus, description) {
  if (response.status !== expectedStatus) {
    throw new Error(`${description} returned HTTP ${response.status}; expected ${expectedStatus}.`);
  }
}

async function testAdminApi(baseUrl) {
  const origin = baseUrl;
  const request = (path, { method = 'GET', body, cookie, requestOrigin = origin, ip } = {}) => {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (requestOrigin !== null) headers.Origin = requestOrigin;
    if (cookie) headers.Cookie = cookie;
    if (ip) headers['CF-Connecting-IP'] = ip;
    return fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  const home = await fetch(baseUrl);
  const policy = home.headers.get('content-security-policy') || '';
  assert(policy.includes("script-src 'self'") && !policy.includes("'unsafe-inline'"), 'Static pages must use the restrictive Content Security Policy.');
  assert(home.headers.get('x-content-type-options') === 'nosniff', 'Static pages must prevent MIME sniffing.');

  const health = await request('/api/health');
  await assertStatus(health, 200, 'Migrated D1 readiness check');
  assert(health.headers.get('cache-control') === 'no-store', 'API responses must not be cached.');

  const noOrigin = await request('/api/settings', { method: 'PUT', body: {}, requestOrigin: null });
  await assertStatus(noOrigin, 403, 'Mutation without Origin');
  const wrongOrigin = await request('/api/settings', { method: 'PUT', body: {}, requestOrigin: 'https://attacker.example' });
  await assertStatus(wrongOrigin, 403, 'Cross-origin mutation');

  const tokenQuery = await request('/api/auth/me?token=not-a-session');
  await assertStatus(tokenQuery, 200, 'URL token compatibility check');
  assert((await tokenQuery.json()).authenticated === false, 'URL tokens must not authenticate an administrator.');

  const protectedRequests = [
    ['/api/stats', 'GET'],
    ['/api/enquiries?limit=20', 'GET'],
    ['/api/services?all=true', 'GET'],
    ['/api/gallery?all=true', 'GET'],
    ['/api/faqs?all=true', 'GET'],
    ['/api/settings', 'PUT'],
    ['/api/content', 'PUT'],
    ['/api/categories', 'POST'],
    ['/api/services', 'POST'],
    ['/api/gallery', 'POST'],
    ['/api/faqs', 'POST'],
    ['/api/upload', 'POST'],
    ['/api/auth/change-password', 'POST'],
  ];
  for (const [path, method] of protectedRequests) {
    const response = await request(path, {
      method,
      ...(method === 'GET' ? {} : { body: {} }),
    });
    await assertStatus(response, 401, `Unauthenticated ${method} ${path}`);
    assert(response.headers.get('cache-control') === 'no-store', `${path} must not be cached.`);
  }

  const login = await request('/api/auth/login', { method: 'POST', body: { password: adminPassword } });
  await assertStatus(login, 200, 'Legacy administrator login');
  const setCookie = login.headers.get('set-cookie') || '';
  assert(/; HttpOnly/i.test(setCookie), 'Admin session cookie must be HttpOnly.');
  assert(/; Secure/i.test(setCookie), 'Admin session cookie must be Secure.');
  assert(/; SameSite=Strict/i.test(setCookie), 'Admin session cookie must use SameSite=Strict.');
  const cookie = setCookie.split(';', 1)[0];
  assert(cookie.startsWith('__Host-orthocare_admin='), 'Admin session must use the __Host- cookie prefix.');

  const authenticated = await request('/api/auth/me', { cookie });
  assert((await authenticated.json()).authenticated === true, 'A valid session cookie must authenticate.');

  const settings = await request('/api/settings');
  const settingsData = await settings.json();
  assert(
    settingsData.openingHoursWeekday === 'Monday – Friday: 9:00 AM – 8:00 PM; Saturday: 9:00 AM – 2:00 PM',
    'The additive business-hours migration must update only the recognized legacy seed value.'
  );
  assert(
    settingsData.address === 'Main Road, Aggarwal Mandi Tatiri, Baghpat, Uttar Pradesh 250609',
    'The legacy address should be normalized by the additive migration.'
  );

  const settingsUpdate = await request('/api/settings', {
    method: 'PUT',
    cookie,
    body: { appointmentNotice: 'CI-only settings update.' },
  });
  await assertStatus(settingsUpdate, 200, 'Authenticated settings update');
  const settingsRead = await request('/api/settings');
  assert((await settingsRead.json()).appointmentNotice === 'CI-only settings update.', 'Settings writes must persist in D1.');

  const categoriesResponse = await request('/api/categories');
  const categories = await categoriesResponse.json();
  const servicesResponse = await request('/api/services');
  const services = await servicesResponse.json();
  const migrationSeed = JSON.parse(await readFile(path.join(projectRoot, 'public', 'site-data.json'), 'utf8'));
  assert(categories.length === migrationSeed.categories.length, 'Category rows must survive normalization.');
  assert(services.length === migrationSeed.services.filter((item) => item.isVisible).length, 'Service rows must survive normalization.');

  const invalidService = await request('/api/services', {
    method: 'POST',
    cookie,
    body: { name: 'CI service', categoryId: 'missing-category', description: 'Synthetic test record.' },
  });
  await assertStatus(invalidService, 400, 'Service creation with an unknown category');
  const invalidServiceUpdate = await request(`/api/services/${services[0].id}`, {
    method: 'PUT',
    cookie,
    body: { categoryId: 'missing-category' },
  });
  await assertStatus(invalidServiceUpdate, 400, 'Service update with an unknown category');

  const invalidCategoryDelete = await request(`/api/categories/${categories[0].id}`, {
    method: 'DELETE',
    cookie,
    body: { fallbackCategoryId: 'missing-category' },
  });
  await assertStatus(invalidCategoryDelete, 400, 'Category deletion with an unknown fallback');

  const duplicateHours = [
    { day: 'monday', isClosed: false, intervals: [{ open: '09:00', close: '12:00' }] },
    { day: 'monday', isClosed: false, intervals: [{ open: '13:00', close: '18:00' }] },
  ];
  const invalidHours = await request('/api/settings', {
    method: 'PUT',
    cookie,
    body: { weeklyHours: duplicateHours },
  });
  await assertStatus(invalidHours, 400, 'Duplicate weekly-hours days');

  let cursor;
  let totalEnquiries = 0;
  do {
    const params = new URLSearchParams({ limit: String(pageSize), status: 'all' });
    if (cursor) {
      params.set('cursorCreatedAt', cursor.createdAt);
      params.set('cursorId', cursor.id);
    }
    const pageResponse = await request(`/api/enquiries?${params}`, { cookie });
    await assertStatus(pageResponse, 200, 'Paginated enquiry read');
    const page = await pageResponse.json();
    assert(Array.isArray(page.items) && page.items.length <= pageSize, 'Enquiry page must be bounded.');
    totalEnquiries += page.items.length;
    cursor = page.nextCursor;
  } while (cursor);
  assert(totalEnquiries === 53, 'Cursor pagination must return every migrated enquiry exactly once.');

  const filteredResponse = await request('/api/enquiries?limit=20&status=closed', { cookie });
  const filteredPage = await filteredResponse.json();
  assert(filteredPage.items.length === 20 && filteredPage.items.every((item) => item.status === 'closed'), 'Enquiry status filters must be applied in D1.');

  const honeypot = await request('/api/enquiries', {
    method: 'POST',
    body: { patientName: 'Synthetic Patient', phoneNumber: '9876543210', website: 'bot-filled' },
  });
  await assertStatus(honeypot, 400, 'Enquiry honeypot');
  const missingOriginEnquiry = await request('/api/enquiries', {
    method: 'POST',
    body: { patientName: 'Synthetic Patient', phoneNumber: '9876543210' },
    requestOrigin: null,
  });
  await assertStatus(missingOriginEnquiry, 403, 'Enquiry without Origin');
  const pastDateEnquiry = await request('/api/enquiries', {
    method: 'POST',
    body: {
      patientName: 'Synthetic Patient',
      phoneNumber: '9876543210',
      preferredDate: '2000-01-01',
    },
    ip: '192.0.2.18',
  });
  await assertStatus(pastDateEnquiry, 400, 'Enquiry with a past preferred date');
  const acceptedEnquiry = await request('/api/enquiries', {
    method: 'POST',
    body: {
      patientName: 'Synthetic Patient',
      phoneNumber: '9876543210',
      serviceRequested: 'CI smoke test',
      preferredDate: '2099-12-31',
    },
    ip: '192.0.2.19',
  });
  await assertStatus(acceptedEnquiry, 201, 'Valid public enquiry');

  const uploadResponse = await request('/api/upload', { method: 'POST', cookie, body: {} });
  await assertStatus(uploadResponse, 503, 'Deferred image upload endpoint');
  assert((await uploadResponse.json()).error.includes('temporarily unavailable'), 'Deferred uploads must report an explicit explanation.');

  const passwordChange = await request('/api/auth/change-password', {
    method: 'POST',
    cookie,
    body: { currentPassword: adminPassword, newPassword: rotatedPassword },
  });
  await assertStatus(passwordChange, 200, 'Password rotation');
  const revokedSession = await request('/api/auth/me', { cookie });
  assert((await revokedSession.json()).authenticated === false, 'Password rotation must revoke existing sessions.');

  const passwordVerificationStartedAt = Date.now();
  const newLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { password: rotatedPassword },
  });
  const passwordVerificationTime = Date.now() - passwordVerificationStartedAt;
  await assertStatus(newLogin, 200, 'Login after password rotation');
  assert(passwordVerificationTime < 5000, 'Password verification exceeded the local Worker test budget.');
  console.log(`PASS legacy PBKDF2-HMAC-SHA-512 login (${passwordVerificationTime} ms in local Worker runtime)`);
  const newCookie = (newLogin.headers.get('set-cookie') || '').split(';', 1)[0];
  const logout = await request('/api/auth/logout', { method: 'POST', cookie: newCookie });
  await assertStatus(logout, 200, 'Session logout');
  assert(/Max-Age=0/i.test(logout.headers.get('set-cookie') || ''), 'Logout must clear the session cookie.');
  const loggedOut = await request('/api/auth/me', { cookie: newCookie });
  assert((await loggedOut.json()).authenticated === false, 'Logout must revoke the session in D1.');

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const failedLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { password: `incorrect-${attempt}` },
      ip: '198.51.100.77',
    });
    await assertStatus(failedLogin, attempt === 5 ? 429 : 401, `Login rate-limit attempt ${attempt}`);
  }
  const blockedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { password: 'incorrect-again' },
    ip: '198.51.100.77',
  });
  await assertStatus(blockedLogin, 429, 'Login rate limit after lockout');
}

async function testFreshAdminInitialization(baseUrl) {
  const startedAt = Date.now();
  await runSmokeTest(baseUrl);
  const initializationTime = Date.now() - startedAt;
  assert(initializationTime < 15000, 'Fresh D1 initialization exceeded the local Worker smoke-test budget.');

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: baseUrl,
    },
    body: JSON.stringify({ password: adminPassword }),
  });
  await assertStatus(login, 200, 'First administrator login after empty-D1 initialization');
  const cookie = (login.headers.get('set-cookie') || '').split(';', 1)[0];
  assert(cookie.startsWith('__Host-orthocare_admin='), 'Fresh initialization must create a secure cookie session.');
  console.log(`PASS secure first-admin initialization (${initializationTime} ms in local Worker runtime)`);
}

try {
  const siteData = JSON.parse(await readFile(path.join(projectRoot, 'public', 'site-data.json'), 'utf8'));
  const { weeklyHours: _weeklyHours, ...legacySettings } = siteData.settings;
  const salt = randomUUID().replaceAll('-', '').slice(0, 32);
  const legacyEnquiries = Array.from({ length: 53 }, (_, index) => {
    const createdAt = new Date(Date.UTC(2025, 0, 1, index)).toISOString();
    return {
      id: `ci-enquiry-${String(index + 1).padStart(3, '0')}`,
      patientName: 'Synthetic Migration Fixture',
      phoneNumber: '9876543210',
      serviceRequested: 'Migration test only',
      preferredDate: '',
      preferredTimeSlot: '',
      message: '',
      isHomeVisitRequested: false,
      status: index % 2 === 0 ? 'new' : 'closed',
      createdAt,
      updatedAt: createdAt,
    };
  });
  const legacyState = {
    ...siteData,
    revision: 7,
    settings: {
      ...legacySettings,
      address: 'Main Road, Aggarwal Mandi, Tatiri, Baghpat, Uttar Pradesh – 250609',
      openingHoursWeekday: 'Monday – Saturday: 9:00 AM – 1:30 PM & 4:30 PM – 8:00 PM',
      openingHoursSunday: 'Sunday: 10:00 AM – 1:00 PM (By Prior Appointment)',
    },
    adminSalt: salt,
    adminPasswordHash: pbkdf2Sync(adminPassword, salt, 10_000, 64, 'sha512').toString('hex'),
    enquiries: legacyEnquiries,
  };
  const legacySql = `INSERT INTO orthocare_clinic_state (id, revision, data) VALUES (1, 7, '${JSON.stringify(legacyState).replaceAll("'", "''")}');\n`;
  const legacySchemaPath = path.join(temporaryDirectory, 'legacy-schema.sql');
  const legacyStatePath = path.join(temporaryDirectory, 'legacy-state.sql');
  await writeFile(legacySchemaPath, await readFile(path.join(projectRoot, 'migrations', '0001_cloudflare_d1.sql')));
  await writeFile(legacyStatePath, legacySql, 'utf8');
  await runWrangler([
    'd1', 'execute', databaseName, '--local', '--persist-to', databaseDirectory,
    '--file', legacySchemaPath,
  ]);
  await runWrangler([
    'd1', 'execute', databaseName, '--local', '--persist-to', databaseDirectory,
    '--file', legacyStatePath,
  ]);
  await runWrangler([
    'd1', 'migrations', 'apply', databaseName,
    '--local', '--persist-to', databaseDirectory,
  ]);

  const baseUrl = await startWorker(databaseDirectory);
  await runSmokeTest(baseUrl);
  await testAdminApi(baseUrl);
  console.log('PASS synthetic legacy D1 migration, Worker API security, pagination, and admin session integration');
  await stopWorker();

  await runWrangler([
    'd1', 'execute', databaseName, '--local', '--persist-to', databaseDirectory,
    '--command', 'ALTER TABLE orthocare_clinic_admin RENAME COLUMN password_salt TO invalid_password_salt;',
  ]);
  const incompleteSchemaBaseUrl = await startWorker(databaseDirectory, 503);
  const incompleteHealth = await fetch(`${incompleteSchemaBaseUrl}/api/health`);
  await assertStatus(incompleteHealth, 503, 'D1 health check with a required column missing');
  await stopWorker();
  console.log('PASS D1 health check rejects an incomplete normalized schema');

  const freshDatabaseDirectory = path.join(temporaryDirectory, 'fresh-d1');
  await runWrangler([
    'd1', 'migrations', 'apply', databaseName,
    '--local', '--persist-to', freshDatabaseDirectory,
  ]);
  const freshBaseUrl = await startWorker(freshDatabaseDirectory);
  await testFreshAdminInitialization(freshBaseUrl);
} finally {
  await stopWorker();
  await removeTemporaryDirectory();
}
