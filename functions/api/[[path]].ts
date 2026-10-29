import seedData from '../../public/site-data.json';
import type {
  FAQItem,
  GalleryItem,
  PatientEnquiry,
  ServiceCategory,
  TreatmentService,
} from '../../src/types';
import { getAdminPasswordPolicyError } from '../../src/authPolicy';
import {
  categoryRules,
  contentRules,
  deleteCategoryRules,
  enquiryRules,
  enquiryStatusRules,
  faqRules,
  galleryRules,
  loginRules,
  passwordChangeRules,
  serviceRules,
  settingsRules,
  validatePayload,
} from '../../src/apiValidation';

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run<T>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<D1Result<T>[]>;
}

interface Env {
  DB: D1Database;
  ADMIN_INITIAL_PASSWORD?: string;
}

interface ClinicDatabase {
  settings: typeof seedData.settings;
  content: typeof seedData.content;
  categories: ServiceCategory[];
  services: TreatmentService[];
  gallery: GalleryItem[];
  faqs: FAQItem[];
  enquiries: PatientEnquiry[];
}

interface ClinicSnapshot {
  revision: number;
  database: ClinicDatabase;
}

interface StoredEnquiry {
  id: string;
  patient_name: string;
  phone_number: string;
  service_requested: string;
  preferred_date: string;
  preferred_time_slot: string;
  message: string;
  is_home_visit_requested: number;
  status: PatientEnquiry['status'];
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const SESSION_COOKIE_NAME = '__Host-orthocare_admin';
const MAX_JSON_BYTES = 512 * 1024;
const ENQUIRY_WINDOW_MS = 15 * 60 * 1000;
const ENQUIRY_MAX_SUBMISSIONS = 5;
const LEGACY_PASSWORD_HASH_ITERATIONS = 10_000;
const ENQUIRY_PAGE_SIZE = 50;
const MAX_ENQUIRY_PAGE_SIZE = 100;
const REQUIRED_D1_COLUMNS: Record<string, readonly string[]> = {
  orthocare_clinic_state: ['id', 'revision', 'data'],
  orthocare_clinic_sessions: ['token_hash', 'expires_at'],
  orthocare_clinic_login_attempts: ['ip_hash', 'window_started_at', 'attempts', 'locked_until'],
  orthocare_clinic_documents: ['document_key', 'data'],
  orthocare_clinic_records: ['record_type', 'record_id', 'category_id', 'is_visible', 'sort_order', 'data'],
  orthocare_clinic_enquiries: [
    'id',
    'patient_name',
    'phone_number',
    'service_requested',
    'preferred_date',
    'preferred_time_slot',
    'message',
    'is_home_visit_requested',
    'status',
    'internal_notes',
    'created_at',
    'updated_at',
  ],
  orthocare_clinic_admin: ['id', 'password_salt', 'password_hash'],
  orthocare_clinic_data_meta: ['id', 'revision', 'mutation_token'],
  orthocare_clinic_enquiry_attempts: ['ip_hash', 'window_started_at', 'attempts'],
};

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}

function getId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return new Uint8Array();
  return Uint8Array.from(value.match(/.{2}/g) || [], (byte) => parseInt(byte, 16));
}

function randomHex(bytes: number): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return toHex(value);
}

function copyArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.length);
  copy.set(value);
  return copy.buffer;
}

function normalizeDatabase(value: unknown): ClinicDatabase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('D1 clinic state is invalid.');
  }
  const parsed = value as Partial<ClinicDatabase>;
  return {
    ...seedData,
    ...parsed,
    settings: { ...seedData.settings, ...(parsed.settings || {}) },
    content: { ...seedData.content, ...(parsed.content || {}) },
    categories: Array.isArray(parsed.categories) ? parsed.categories : seedData.categories,
    services: Array.isArray(parsed.services) ? parsed.services : seedData.services,
    gallery: Array.isArray(parsed.gallery) ? parsed.gallery : seedData.gallery,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : seedData.faqs,
    enquiries: [],
  } as ClinicDatabase;
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
  hash: 'SHA-256' | 'SHA-512'
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: copyArrayBuffer(salt),
      iterations,
      hash,
    },
    key,
    hash === 'SHA-512' ? 512 : 256
  );
  return toHex(new Uint8Array(bits));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return derivePasswordHash(
    password,
    fromHex(salt),
    LEGACY_PASSWORD_HASH_ITERATIONS,
    'SHA-512'
  );
}

async function verifyPassword(
  password: string,
  salt: string,
  storedHash: string
): Promise<{ matches: boolean }> {
  if (!/^[0-9a-f]{32}$/i.test(salt)) {
    throw new Error('D1 administrator password salt has an invalid format.');
  }
  if (!/^[0-9a-f]{128}$/i.test(storedHash)) {
    throw new Error('D1 administrator password hash uses an unsupported format.');
  }

  const expected = fromHex(storedHash);
  const [hexSaltCandidate, textSaltCandidate] = await Promise.all([
    derivePasswordHash(
      password,
      fromHex(salt),
      LEGACY_PASSWORD_HASH_ITERATIONS,
      'SHA-512'
    ),
    derivePasswordHash(
      password,
      new TextEncoder().encode(salt),
      LEGACY_PASSWORD_HASH_ITERATIONS,
      'SHA-512'
    ),
  ]);
  const matchesHexSalt = constantTimeEqual(fromHex(hexSaltCandidate), expected);
  const matchesTextSalt = constantTimeEqual(fromHex(textSaltCandidate), expected);
  return { matches: matchesHexSalt || matchesTextSalt };
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

function parseStoredJson<T>(value: string, label: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`D1 ${label} contains invalid JSON.`);
  }
}

async function readAdminCredentials(env: Env): Promise<{ password_salt: string; password_hash: string } | null> {
  return env.DB
    .prepare('SELECT password_salt, password_hash FROM orthocare_clinic_admin WHERE id = 1')
    .first<{ password_salt: string; password_hash: string }>();
}

async function readClinicSnapshot(env: Env): Promise<ClinicSnapshot> {
  const [metaResult, documentResult, recordsResult] = await Promise.all([
    env.DB.prepare('SELECT revision FROM orthocare_clinic_data_meta WHERE id = 1').first<{ revision: number }>(),
    env.DB.prepare('SELECT document_key, data FROM orthocare_clinic_documents').all<{ document_key: string; data: string }>(),
    env.DB.prepare('SELECT record_type, data FROM orthocare_clinic_records ORDER BY sort_order, record_id').all<{ record_type: string; data: string }>(),
  ]);
  if (!metaResult) throw new Error('Normalized D1 clinic metadata is unavailable.');

  const documents = new Map((documentResult.results || []).map((row) => [row.document_key, row.data]));
  const records = {
    categories: [] as ServiceCategory[],
    services: [] as TreatmentService[],
    gallery: [] as GalleryItem[],
    faqs: [] as FAQItem[],
  };
  for (const row of recordsResult.results || []) {
    const record = parseStoredJson<unknown>(row.data, `${row.record_type} record`);
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error(`D1 ${row.record_type} record has an invalid shape.`);
    }
    if (row.record_type === 'category') records.categories.push(record as ServiceCategory);
    else if (row.record_type === 'service') records.services.push(record as TreatmentService);
    else if (row.record_type === 'gallery') records.gallery.push(record as GalleryItem);
    else if (row.record_type === 'faq') records.faqs.push(record as FAQItem);
    else throw new Error(`D1 contains an unknown clinic record type: ${row.record_type}.`);
  }

  const settings = documents.get('settings');
  const content = documents.get('content');
  if (!settings || !content) throw new Error('D1 clinic settings or content have not been migrated.');
  return {
    revision: Number(metaResult.revision),
    database: {
      settings: { ...seedData.settings, ...parseStoredJson(settings, 'clinic settings') },
      content: { ...seedData.content, ...parseStoredJson(content, 'clinic content') },
      ...records,
      enquiries: [],
    },
  };
}

async function ensureState(env: Env): Promise<void> {
  if (await readAdminCredentials(env)) return;
  const legacyState = await env.DB
    .prepare('SELECT 1 AS exists_flag FROM orthocare_clinic_state WHERE id = 1')
    .first<{ exists_flag: number }>();
  const existingRecords = await env.DB
    .prepare(`SELECT
      (SELECT COUNT(*) FROM orthocare_clinic_documents) +
      (SELECT COUNT(*) FROM orthocare_clinic_records) +
      (SELECT COUNT(*) FROM orthocare_clinic_enquiries) AS record_count`)
    .first<{ record_count: number }>();
  if (legacyState || Number(existingRecords?.record_count || 0) > 0) {
    throw new Error('Existing clinic data was found without normalized admin credentials. Apply and verify the normalized D1 migration; no data was changed.');
  }

  const password = env.ADMIN_INITIAL_PASSWORD;
  if (!password || getAdminPasswordPolicyError(password)) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD as a Cloudflare Pages secret (15-128 characters) before initializing D1.');
  }

  const salt = randomHex(16);
  const database = normalizeDatabase(seedData);
  const statements = [
    env.DB.prepare('INSERT OR IGNORE INTO orthocare_clinic_data_meta (id, revision) VALUES (1, 0)'),
    env.DB.prepare('INSERT OR IGNORE INTO orthocare_clinic_admin (id, password_salt, password_hash) VALUES (1, ?, ?)')
      .bind(salt, await hashPassword(password, salt)),
    env.DB.prepare('INSERT OR IGNORE INTO orthocare_clinic_documents (document_key, data) VALUES (?, ?)')
      .bind('settings', JSON.stringify(database.settings)),
    env.DB.prepare('INSERT OR IGNORE INTO orthocare_clinic_documents (document_key, data) VALUES (?, ?)')
      .bind('content', JSON.stringify(database.content)),
    ...database.categories.map((record) => statementForRecord(env, 'category', record)),
    ...database.services.map((record) => statementForRecord(env, 'service', record)),
    ...database.gallery.map((record) => statementForRecord(env, 'gallery', record)),
    ...database.faqs.map((record) => statementForRecord(env, 'faq', record)),
  ];
  await env.DB.batch(statements);
  if (!(await readAdminCredentials(env))) throw new Error('D1 clinic initialization did not create admin credentials.');
}

async function getDatabase(env: Env): Promise<ClinicDatabase> {
  await ensureState(env);
  return (await readClinicSnapshot(env)).database;
}

type ClinicRecordType = 'category' | 'service' | 'gallery' | 'faq';
type ClinicRecord = ServiceCategory | TreatmentService | GalleryItem | FAQItem;

function statementForRecord(env: Env, type: ClinicRecordType, record: ClinicRecord, mutationToken?: string): D1Statement {
  const categoryId = type === 'service' ? (record as TreatmentService).categoryId : null;
  const visible = 'isVisible' in record ? Number(record.isVisible) : 1;
  const order = Number(record.order) || 0;
  const query = mutationToken === undefined
    ? `INSERT OR IGNORE INTO orthocare_clinic_records
       (record_type, record_id, category_id, is_visible, sort_order, data) VALUES (?, ?, ?, ?, ?, ?)`
    : `INSERT INTO orthocare_clinic_records
       (record_type, record_id, category_id, is_visible, sort_order, data)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM orthocare_clinic_data_meta WHERE id = 1 AND mutation_token = ?)
       ON CONFLICT(record_type, record_id) DO UPDATE SET
         category_id = excluded.category_id, is_visible = excluded.is_visible,
         sort_order = excluded.sort_order, data = excluded.data
       WHERE EXISTS (SELECT 1 FROM orthocare_clinic_data_meta WHERE id = 1 AND mutation_token = ?)`;
  return mutationToken === undefined
    ? env.DB.prepare(query).bind(type, record.id, categoryId, visible, order, JSON.stringify(record))
    : env.DB.prepare(query).bind(
      type,
      record.id,
      categoryId,
      visible,
      order,
      JSON.stringify(record),
      mutationToken,
      mutationToken
    );
}

async function mutateDatabase<T>(
  env: Env,
  mutate: (database: ClinicDatabase) => T | Promise<T>
): Promise<T> {
  await ensureState(env);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const state = await readClinicSnapshot(env);
    const database = structuredClone(state.database);
    const result = await mutate(database);
    if (result === null || result === false) return result;

    const nextRevision = state.revision + 1;
    const mutationToken = randomHex(16);
    const statements: D1Statement[] = [
      env.DB.prepare('UPDATE orthocare_clinic_data_meta SET revision = ?, mutation_token = ? WHERE id = 1 AND revision = ?')
        .bind(nextRevision, mutationToken, state.revision),
    ];
    for (const key of ['settings', 'content'] as const) {
      if (JSON.stringify(database[key]) !== JSON.stringify(state.database[key])) {
        statements.push(
          env.DB.prepare(`INSERT INTO orthocare_clinic_documents (document_key, data)
            SELECT ?, ? WHERE EXISTS (
              SELECT 1 FROM orthocare_clinic_data_meta WHERE id = 1 AND mutation_token = ?
            )
            ON CONFLICT(document_key) DO UPDATE SET data = excluded.data
            WHERE EXISTS (SELECT 1 FROM orthocare_clinic_data_meta WHERE id = 1 AND mutation_token = ?)`)
            .bind(key, JSON.stringify(database[key]), mutationToken, mutationToken)
        );
      }
    }
    const collections = [
      ['category', 'categories'],
      ['service', 'services'],
      ['gallery', 'gallery'],
      ['faq', 'faqs'],
    ] as const;
    for (const [type, key] of collections) {
      const oldRecords = state.database[key] as ClinicRecord[];
      const newRecords = database[key] as ClinicRecord[];
      const oldById = new Map(oldRecords.map((record) => [record.id, record]));
      const newById = new Map(newRecords.map((record) => [record.id, record]));
      for (const record of newRecords) {
        if (JSON.stringify(oldById.get(record.id)) !== JSON.stringify(record)) {
          statements.push(statementForRecord(env, type, record, mutationToken));
        }
      }
      for (const record of oldRecords) {
        if (!newById.has(record.id)) {
          statements.push(
            env.DB.prepare(`DELETE FROM orthocare_clinic_records
              WHERE record_type = ? AND record_id = ?
                AND EXISTS (SELECT 1 FROM orthocare_clinic_data_meta WHERE id = 1 AND mutation_token = ?)`)
              .bind(type, record.id, mutationToken)
          );
        }
      }
    }
    const updates = await env.DB.batch(statements);
    if ((updates[0]?.meta?.changes || 0) === 1) return result;
  }
  throw new Error('Clinic data changed concurrently too many times. Please retry.');
}

function getSessionToken(request: Request): string | undefined {
  const cookie = request.headers.get('cookie');
  const session = cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  return session && /^[0-9a-f]{64}$/i.test(session) ? session : undefined;
}

function sessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie(): string {
  return sessionCookie('', 0);
}

async function getLoginKey(request: Request): Promise<string> {
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
  return hashToken(`admin-login:${clientIp}`);
}

async function getEnquiryRateLimitKey(request: Request): Promise<string> {
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
  return hashToken(`public-enquiry:${clientIp}`);
}

async function consumeEnquirySubmission(env: Env, ipHash: string): Promise<number> {
  const now = Date.now();
  const attempt = await env.DB
    .prepare(`INSERT INTO orthocare_clinic_enquiry_attempts (ip_hash, window_started_at, attempts)
      VALUES (?, ?, 1)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE attempts + 1 END,
        window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END
      RETURNING attempts, window_started_at`)
    .bind(ipHash, now, now - ENQUIRY_WINDOW_MS, now - ENQUIRY_WINDOW_MS)
    .first<{ attempts: number; window_started_at: number }>();
  if (!attempt) throw new Error('D1 did not return the enquiry rate-limit result.');
  if (Number(attempt.attempts) <= ENQUIRY_MAX_SUBMISSIONS) return 0;
  return Math.max(
    1,
    Math.ceil((Number(attempt.window_started_at) + ENQUIRY_WINDOW_MS - now) / 1000)
  );
}

async function getLoginRetryAfter(env: Env, ipHash: string): Promise<number> {
  const attempt = await env.DB
    .prepare('SELECT locked_until FROM orthocare_clinic_login_attempts WHERE ip_hash = ?')
    .bind(ipHash)
    .first<{ locked_until: number }>();
  return attempt ? Math.max(0, Math.ceil((Number(attempt.locked_until) - Date.now()) / 1000)) : 0;
}

async function cleanupExpiredSecurityRecords(env: Env): Promise<void> {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM orthocare_clinic_sessions
      WHERE rowid IN (
        SELECT rowid FROM orthocare_clinic_sessions WHERE expires_at <= ? LIMIT 100
      )`).bind(now),
    env.DB.prepare(`DELETE FROM orthocare_clinic_login_attempts
      WHERE rowid IN (
        SELECT rowid FROM orthocare_clinic_login_attempts
        WHERE window_started_at < ? AND locked_until <= ? LIMIT 100
      )`).bind(now - LOGIN_WINDOW_MS * 2, now),
    env.DB.prepare(`DELETE FROM orthocare_clinic_enquiry_attempts
      WHERE rowid IN (
        SELECT rowid FROM orthocare_clinic_enquiry_attempts
        WHERE window_started_at < ? LIMIT 100
      )`).bind(now - ENQUIRY_WINDOW_MS * 2),
  ]);
}

async function recordLoginFailure(env: Env, ipHash: string): Promise<number> {
  const now = Date.now();
  await env.DB
    .prepare(`INSERT INTO orthocare_clinic_login_attempts (ip_hash, window_started_at, attempts, locked_until)
      VALUES (?, ?, 1, 0)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE attempts + 1 END,
        window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END,
        locked_until = CASE
          WHEN window_started_at <= ? THEN 0
          WHEN attempts + 1 >= ? THEN excluded.window_started_at + ?
          ELSE locked_until
        END`)
    .bind(ipHash, now, now - LOGIN_WINDOW_MS, now - LOGIN_WINDOW_MS, now - LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS)
    .run();
  return getLoginRetryAfter(env, ipHash);
}

function withPrivateHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set('Cache-Control', 'no-store');
  return result;
}

async function validateSession(env: Env, token?: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = await hashToken(token);
  const row = await env.DB
    .prepare('SELECT expires_at FROM orthocare_clinic_sessions WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ expires_at: number }>();
  if (!row) return false;
  if (row.expires_at <= Date.now()) {
    await env.DB
      .prepare('DELETE FROM orthocare_clinic_sessions WHERE token_hash = ?')
      .bind(tokenHash)
      .run();
    return false;
  }
  return true;
}

async function requireAdmin(env: Env, token?: string): Promise<Response | null> {
  return await validateSession(env, token)
    ? null
    : json({ error: 'Unauthorized: Admin session required or expired' }, 401);
}

async function readBody(request: Request): Promise<Record<string, any>> {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_JSON_BYTES) throw new ApiError('Request body exceeds the allowed size.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('Request body must contain valid JSON.', 400);
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_JSON_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new ApiError('Request body exceeds the allowed size.', 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Request body could not be read.', 400);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError('Request body must contain valid JSON.', 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError('Request body must be a JSON object.', 400);
  }
  return body as Record<string, any>;
}

function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.order - right.order);
}

function mapEnquiry(row: StoredEnquiry): PatientEnquiry {
  return {
    id: row.id,
    patientName: row.patient_name,
    phoneNumber: row.phone_number,
    serviceRequested: row.service_requested,
    preferredDate: row.preferred_date,
    preferredTimeSlot: row.preferred_time_slot,
    message: row.message,
    isHomeVisitRequested: Boolean(row.is_home_visit_requested),
    status: row.status,
    internalNotes: row.internal_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [resource, id] = segments;
  const method = request.method.toUpperCase();
  const token = getSessionToken(request);

  if (method === 'OPTIONS') return new Response(null, { status: 204 });
  const origin = request.headers.get('origin');
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !origin) {
    return json({ error: 'An Origin header is required for API mutations.' }, 403);
  }
  if (origin) {
    try {
      if (new URL(origin).origin !== url.origin) {
        return json({ error: 'Cross-origin requests are not allowed.' }, 403);
      }
    } catch {
      return json({ error: 'Cross-origin requests are not allowed.' }, 403);
    }
  }

  if (resource === 'health' && method === 'GET') {
    const tableResult = await env.DB
      .prepare(`SELECT COUNT(*) AS table_count FROM sqlite_master
        WHERE type = 'table' AND name IN (${Object.keys(REQUIRED_D1_COLUMNS).map(() => '?').join(', ')})`)
      .bind(...Object.keys(REQUIRED_D1_COLUMNS))
      .first<{ table_count: number }>();
    if (Number(tableResult?.table_count) !== Object.keys(REQUIRED_D1_COLUMNS).length) {
      return json({ status: 'unavailable' }, 503);
    }

    const columnChecks = await Promise.all(
      Object.entries(REQUIRED_D1_COLUMNS).map(async ([table, requiredColumns]) => {
        const result = await env.DB
          .prepare('SELECT name FROM pragma_table_info(?)')
          .bind(table)
          .all<{ name: string }>();
        const columns = new Set((result.results || []).map(({ name }) => name));
        return requiredColumns.every((column) => columns.has(column));
      })
    );
    if (columnChecks.some((hasColumns) => !hasColumns)) {
      return json({ status: 'unavailable' }, 503);
    }

    return json({ status: 'ok', time: new Date().toISOString() });
  }

  if (resource === 'auth' && segments[1] === 'login' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, loginRules, ['password']);
    if (validationError) return json({ error: validationError }, 400);
    const loginKey = await getLoginKey(request);
    const retryAfter = await getLoginRetryAfter(env, loginKey);
    if (retryAfter > 0) {
      return json(
        { error: 'Too many unsuccessful login attempts. Please try again later.' },
        429,
        withPrivateHeaders({ 'Retry-After': String(retryAfter) })
      );
    }
    await ensureState(env);
    await cleanupExpiredSecurityRecords(env);
    const credentials = await readAdminCredentials(env);
    if (!credentials) throw new Error('D1 administrator credentials are unavailable.');
    const verification = await verifyPassword(
      body.password,
      credentials.password_salt,
      credentials.password_hash
    );
    if (!verification.matches) {
      const failureRetryAfter = await recordLoginFailure(env, loginKey);
      if (failureRetryAfter > 0) {
        return json(
          { error: 'Too many unsuccessful login attempts. Please try again later.' },
          429,
          withPrivateHeaders({ 'Retry-After': String(failureRetryAfter) })
        );
      }
      return json(
        { error: 'Invalid password. Please enter the correct admin password.' },
        401,
        withPrivateHeaders()
      );
    }
    const sessionToken = randomHex(32);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM orthocare_clinic_login_attempts WHERE ip_hash = ?')
        .bind(loginKey),
      env.DB.prepare('INSERT INTO orthocare_clinic_sessions (token_hash, expires_at) VALUES (?, ?)')
        .bind(await hashToken(sessionToken), Date.now() + SESSION_TTL_SECONDS * 1000),
    ]);
    return json(
      { success: true, message: 'Logged in successfully' },
      200,
      withPrivateHeaders({ 'Set-Cookie': sessionCookie(sessionToken, SESSION_TTL_SECONDS) })
    );
  }

  if (resource === 'auth' && segments[1] === 'logout' && method === 'POST') {
    if (token) {
      await env.DB
        .prepare('DELETE FROM orthocare_clinic_sessions WHERE token_hash = ?')
        .bind(await hashToken(token))
        .run();
    }
    return json(
      { success: true, message: 'Logged out successfully' },
      200,
      withPrivateHeaders({ 'Set-Cookie': clearSessionCookie() })
    );
  }

  if (resource === 'auth' && segments[1] === 'me' && method === 'GET') {
    return json({ authenticated: await validateSession(env, token) }, 200, withPrivateHeaders());
  }

  if (resource === 'settings' && method === 'GET') {
    return json((await getDatabase(env)).settings);
  }
  if (resource === 'content' && method === 'GET') {
    return json((await getDatabase(env)).content);
  }
  if (resource === 'categories' && method === 'GET') {
    return json(sortByOrder((await getDatabase(env)).categories));
  }

  if (
    ['settings', 'content', 'categories', 'services', 'gallery', 'faqs', 'enquiries', 'upload', 'stats'].includes(resource) &&
    !(resource === 'enquiries' && method === 'POST')
  ) {
    const authError = await requireAdmin(env, token);
    if (authError) {
      if (
        method === 'GET' &&
        ['services', 'gallery', 'faqs'].includes(resource) &&
        url.searchParams.get('all') !== 'true'
      ) {
        // Public list reads remain available below.
      } else {
        return authError;
      }
    }
  }

  if (resource === 'auth' && segments[1] === 'change-password' && method === 'POST') {
    const authError = await requireAdmin(env, token);
    if (authError) return authError;
    const body = await readBody(request);
    const validationError = validatePayload(body, passwordChangeRules, ['currentPassword', 'newPassword']);
    if (validationError) return json({ error: validationError }, 400);
    const passwordError = getAdminPasswordPolicyError(body.newPassword);
    if (passwordError) {
      return json({ error: passwordError }, 400);
    }
    const credentials = await readAdminCredentials(env);
    if (!credentials) throw new Error('D1 administrator credentials are unavailable.');
    const currentPassword = await verifyPassword(
      body.currentPassword,
      credentials.password_salt,
      credentials.password_hash
    );
    if (!currentPassword.matches) {
      return json({ error: 'Current password was incorrect' }, 400);
    }
    const salt = randomHex(16);
    const passwordHash = await hashPassword(body.newPassword, salt);
    const results = await env.DB.batch([
      env.DB.prepare(`UPDATE orthocare_clinic_admin SET password_salt = ?, password_hash = ?
        WHERE id = 1 AND password_salt = ? AND password_hash = ?`)
        .bind(salt, passwordHash, credentials.password_salt, credentials.password_hash),
      env.DB.prepare(`DELETE FROM orthocare_clinic_sessions
        WHERE EXISTS (
          SELECT 1 FROM orthocare_clinic_admin WHERE id = 1 AND password_salt = ? AND password_hash = ?
        )`)
        .bind(salt, passwordHash),
    ]);
    if ((results[0]?.meta?.changes || 0) !== 1) {
      return json({ error: 'Administrator credentials changed concurrently. Please retry.' }, 409);
    }
    return json(
      { success: true, message: 'Admin password updated successfully. Please sign in again.' },
      200,
      withPrivateHeaders({ 'Set-Cookie': clearSessionCookie() })
    );
  }

  if (resource === 'settings' && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, settingsRules);
    if (validationError) return json({ error: validationError }, 400);
    const settings = await mutateDatabase(env, (database) => {
      database.settings = { ...database.settings, ...body };
      return database.settings;
    });
    return json({ success: true, settings });
  }
  if (resource === 'content' && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, contentRules);
    if (validationError) return json({ error: validationError }, 400);
    const content = await mutateDatabase(env, (database) => {
      database.content = { ...database.content, ...body };
      return database.content;
    });
    return json({ success: true, content });
  }

  if (resource === 'services' && method === 'GET') {
    const database = await getDatabase(env);
    const includeAll = url.searchParams.get('all') === 'true' && await validateSession(env, token);
    return json(sortByOrder(database.services.filter((item) => includeAll || item.isVisible)));
  }
  if (resource === 'gallery' && method === 'GET') {
    const database = await getDatabase(env);
    const includeAll = url.searchParams.get('all') === 'true' && await validateSession(env, token);
    return json(sortByOrder(database.gallery.filter((item) => includeAll || item.isVisible)));
  }
  if (resource === 'faqs' && method === 'GET') {
    const database = await getDatabase(env);
    const includeAll = url.searchParams.get('all') === 'true' && await validateSession(env, token);
    return json(sortByOrder(database.faqs.filter((item) => includeAll || item.isVisible)));
  }

  if (resource === 'categories' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, categoryRules, ['name']);
    if (validationError) return json({ error: validationError }, 400);
    const created = await mutateDatabase(env, (database) => {
      const item: ServiceCategory = {
        id: getId('cat'),
        name: body.name,
        nameHi: body.nameHi || body.name,
        order: Number(body.order) || 99,
        description: body.description || '',
      };
      database.categories.push(item);
      return item;
    });
    return json(created, 201);
  }
  if (resource === 'categories' && id && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, categoryRules);
    if (validationError) return json({ error: validationError }, 400);
    const updated = await mutateDatabase(env, (database) => {
      const index = database.categories.findIndex((item) => item.id === id);
      if (index < 0) return null;
      database.categories[index] = { ...database.categories[index], ...body, id };
      return database.categories[index];
    });
    return updated ? json(updated) : json({ error: 'Category not found' }, 404);
  }
  if (resource === 'categories' && id && method === 'DELETE') {
    const body = await readBody(request);
    const validationError = validatePayload(body, deleteCategoryRules);
    if (validationError) return json({ error: validationError }, 400);
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.categories.findIndex((item) => item.id === id);
      if (index < 0) return null;
      const remainingCategories = database.categories.filter((item) => item.id !== id);
      const fallbackId = body.fallbackCategoryId || remainingCategories[0]?.id;
      if (
        (body.fallbackCategoryId && !remainingCategories.some((item) => item.id === fallbackId)) ||
        (database.services.some((service) => service.categoryId === id) &&
          !remainingCategories.some((item) => item.id === fallbackId))
      ) {
        return false;
      }
      if (fallbackId) {
        database.services = database.services.map((service) =>
          service.categoryId === id ? { ...service, categoryId: fallbackId } : service
        );
      }
      database.categories.splice(index, 1);
      return true;
    });
    if (deleted === null) return json({ error: 'Category not found' }, 404);
    if (deleted === false) {
      return json({ error: 'Choose an existing category before deleting this category.' }, 400);
    }
    return json({ success: true, message: 'Category deleted and services safely reassigned' });
  }

  if (resource === 'services' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, serviceRules, ['name', 'categoryId', 'description']);
    if (validationError) return json({ error: validationError }, 400);
    const created = await mutateDatabase(env, (database) => {
      if (!database.categories.some((category) => category.id === body.categoryId)) return false;
      const item: TreatmentService = {
        id: getId('srv'),
        name: body.name,
        nameHi: body.nameHi || body.name,
        categoryId: body.categoryId,
        description: body.description,
        descriptionHi: body.descriptionHi || body.description,
        roleOfPhysio: body.roleOfPhysio || '',
        roleOfPhysioHi: body.roleOfPhysioHi || '',
        commonSymptoms: Array.isArray(body.commonSymptoms) ? body.commonSymptoms : [],
        durationMinutes: Number(body.durationMinutes) || 40,
        priceNote: body.priceNote || '',
        homeVisitEligible: Boolean(body.homeVisitEligible),
        isVisible: body.isVisible !== false,
        order: Number(body.order) || 99,
        image: body.image || '',
      };
      database.services.push(item);
      return item;
    });
    if (created === false) return json({ error: 'The selected service category does not exist.' }, 400);
    return json(created, 201);
  }
  if (resource === 'services' && id && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, serviceRules);
    if (validationError) return json({ error: validationError }, 400);
    const updated = await mutateDatabase(env, (database) => {
      const index = database.services.findIndex((item) => item.id === id);
      if (index < 0) return null;
      if (
        body.categoryId !== undefined &&
        !database.categories.some((category) => category.id === body.categoryId)
      ) {
        return false;
      }
      database.services[index] = { ...database.services[index], ...body, id };
      return database.services[index];
    });
    if (updated === false) return json({ error: 'The selected service category does not exist.' }, 400);
    return updated ? json(updated) : json({ error: 'Service not found' }, 404);
  }
  if (resource === 'services' && id && method === 'DELETE') {
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.services.findIndex((item) => item.id === id);
      if (index < 0) return false;
      database.services.splice(index, 1);
      return true;
    });
    return deleted ? json({ success: true }) : json({ error: 'Service not found' }, 404);
  }

  if (resource === 'gallery' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, galleryRules, ['title', 'url']);
    if (validationError) return json({ error: validationError }, 400);
    const created = await mutateDatabase(env, (database) => {
      const item: GalleryItem = {
        id: getId('gal'),
        title: body.title,
        category: body.category || 'rehabilitation',
        url: body.url,
        alt: body.alt || body.title,
        caption: body.caption || '',
        order: Number(body.order) || 99,
        isVisible: body.isVisible !== false,
      };
      database.gallery.push(item);
      return item;
    });
    return json(created, 201);
  }
  if (resource === 'gallery' && id && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, galleryRules);
    if (validationError) return json({ error: validationError }, 400);
    const updated = await mutateDatabase(env, (database) => {
      const index = database.gallery.findIndex((item) => item.id === id);
      if (index < 0) return null;
      database.gallery[index] = { ...database.gallery[index], ...body, id };
      return database.gallery[index];
    });
    return updated ? json(updated) : json({ error: 'Gallery item not found' }, 404);
  }
  if (resource === 'gallery' && id && method === 'DELETE') {
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.gallery.findIndex((item) => item.id === id);
      if (index < 0) return false;
      database.gallery.splice(index, 1);
      return true;
    });
    return deleted ? json({ success: true }) : json({ error: 'Gallery item not found' }, 404);
  }

  if (resource === 'faqs' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, faqRules, ['question', 'answer']);
    if (validationError) return json({ error: validationError }, 400);
    const created = await mutateDatabase(env, (database) => {
      const item: FAQItem = {
        id: getId('faq'),
        question: body.question,
        questionHi: body.questionHi || body.question,
        answer: body.answer,
        answerHi: body.answerHi || body.answer,
        category: body.category || 'general',
        order: Number(body.order) || 99,
        isVisible: body.isVisible !== false,
      };
      database.faqs.push(item);
      return item;
    });
    return json(created, 201);
  }
  if (resource === 'faqs' && id && method === 'PUT') {
    const body = await readBody(request);
    const validationError = validatePayload(body, faqRules);
    if (validationError) return json({ error: validationError }, 400);
    const updated = await mutateDatabase(env, (database) => {
      const index = database.faqs.findIndex((item) => item.id === id);
      if (index < 0) return null;
      database.faqs[index] = { ...database.faqs[index], ...body, id };
      return database.faqs[index];
    });
    return updated ? json(updated) : json({ error: 'FAQ not found' }, 404);
  }
  if (resource === 'faqs' && id && method === 'DELETE') {
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.faqs.findIndex((item) => item.id === id);
      if (index < 0) return false;
      database.faqs.splice(index, 1);
      return true;
    });
    return deleted ? json({ success: true }) : json({ error: 'FAQ not found' }, 404);
  }

  if (resource === 'enquiries' && method === 'POST') {
    const body = await readBody(request);
    const validationError = validatePayload(body, enquiryRules, ['patientName', 'phoneNumber']);
    if (validationError) return json({ error: validationError }, 400);
    if (typeof body.website === 'string' && body.website.trim()) {
      return json({ error: 'Unable to submit enquiry. Please review the form and try again.' }, 400);
    }
    if (!/^[+\d\s().-]+$/.test(body.phoneNumber)) {
      return json({ error: 'Please provide a valid 10-digit mobile number' }, 400);
    }
    const submittedDigits = body.phoneNumber.replace(/\D/g, '');
    const phoneNumber = submittedDigits.length === 12 && submittedDigits.startsWith('91')
      ? submittedDigits.slice(2)
      : submittedDigits.length === 11 && submittedDigits.startsWith('0')
        ? submittedDigits.slice(1)
        : submittedDigits;
    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      return json({ error: 'Please provide a valid 10-digit mobile number' }, 400);
    }
    const rateLimitRetryAfter = await consumeEnquirySubmission(env, await getEnquiryRateLimitKey(request));
    if (rateLimitRetryAfter > 0) {
      return json(
        { error: 'Too many enquiries have been submitted from this connection. Please try again later.' },
        429,
        withPrivateHeaders({ 'Retry-After': String(rateLimitRetryAfter) })
      );
    }
    await cleanupExpiredSecurityRecords(env);
    const now = new Date().toISOString();
    const enquiry: PatientEnquiry = {
      id: getId('enq'),
      patientName: body.patientName.trim(),
      phoneNumber,
      serviceRequested: body.serviceRequested?.trim() || 'General Physiotherapy Consultation',
      preferredDate: body.preferredDate || '',
      preferredTimeSlot: body.preferredTimeSlot || '',
      message: body.message?.trim() || '',
      isHomeVisitRequested: body.isHomeVisitRequested === true,
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };
    await env.DB
      .prepare(`INSERT INTO orthocare_clinic_enquiries
        (id, patient_name, phone_number, service_requested, preferred_date, preferred_time_slot,
         message, is_home_visit_requested, status, internal_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`)
      .bind(
        enquiry.id,
        enquiry.patientName,
        enquiry.phoneNumber,
        enquiry.serviceRequested,
        enquiry.preferredDate,
        enquiry.preferredTimeSlot,
        enquiry.message,
        Number(enquiry.isHomeVisitRequested),
        enquiry.status,
        enquiry.createdAt,
        enquiry.updatedAt
      )
      .run();
    return json({
      success: true,
      enquiryId: enquiry.id,
      message: 'Your enquiry has been received. Our clinic team will contact you shortly to confirm the appointment.',
    }, 201);
  }
  if (resource === 'enquiries' && method === 'GET') {
    const hasPagination = ['limit', 'status', 'cursorCreatedAt', 'cursorId']
      .some((key) => url.searchParams.has(key));
    const rawLimit = url.searchParams.get('limit');
    const limit = rawLimit === null
      ? (hasPagination ? ENQUIRY_PAGE_SIZE : MAX_ENQUIRY_PAGE_SIZE)
      : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ENQUIRY_PAGE_SIZE) {
      return json({ error: `Page size must be between 1 and ${MAX_ENQUIRY_PAGE_SIZE}.` }, 400);
    }

    const status = url.searchParams.get('status') || 'all';
    const allowedStatuses = ['all', 'new', 'contacted', 'scheduled', 'completed', 'closed'];
    if (!allowedStatuses.includes(status)) return json({ error: 'A valid enquiry status is required.' }, 400);

    const hasCursorCreatedAt = url.searchParams.has('cursorCreatedAt');
    const hasCursorId = url.searchParams.has('cursorId');
    const cursorCreatedAt = url.searchParams.get('cursorCreatedAt');
    const cursorId = url.searchParams.get('cursorId');
    if (
      hasCursorCreatedAt !== hasCursorId ||
      (cursorCreatedAt !== null && cursorCreatedAt.length > 64) ||
      (cursorId !== null && (cursorId.length < 1 || cursorId.length > 160))
    ) {
      return json({ error: 'The enquiry page cursor is invalid.' }, 400);
    }

    const filters: string[] = [];
    const values: unknown[] = [];
    if (status !== 'all') {
      filters.push('status = ?');
      values.push(status);
    }
    if (cursorCreatedAt !== null && cursorId !== null) {
      filters.push('(created_at < ? OR (created_at = ? AND id < ?))');
      values.push(cursorCreatedAt, cursorCreatedAt, cursorId);
    }
    const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await env.DB
      .prepare(`SELECT * FROM orthocare_clinic_enquiries ${where}
        ORDER BY created_at DESC, id DESC LIMIT ?`)
      .bind(...values, limit + 1)
      .all<StoredEnquiry>();
    const rows = result.results || [];
    const items = rows.slice(0, limit).map(mapEnquiry);
    if (!hasPagination) return json(items);

    const lastItem = items[items.length - 1];
    return json({
      items,
      nextCursor: rows.length > limit && lastItem
        ? { createdAt: lastItem.createdAt || '', id: lastItem.id }
        : null,
    });
  }
  if (resource === 'enquiries' && id && method === 'PATCH') {
    const body = await readBody(request);
    const validationError = validatePayload(body, enquiryStatusRules, ['status']);
    if (validationError) return json({ error: validationError }, 400);
    const allowedStatuses = ['new', 'contacted', 'scheduled', 'completed', 'closed'];
    if (!allowedStatuses.includes(body.status)) return json({ error: 'A valid status is required' }, 400);
    const result = body.internalNotes === undefined
      ? await env.DB
        .prepare('UPDATE orthocare_clinic_enquiries SET status = ?, updated_at = ? WHERE id = ?')
        .bind(body.status, new Date().toISOString(), id)
        .run()
      : await env.DB
        .prepare('UPDATE orthocare_clinic_enquiries SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?')
        .bind(body.status, body.internalNotes, new Date().toISOString(), id)
        .run();
    if ((result.meta?.changes || 0) === 0) return json({ error: 'Enquiry not found' }, 404);
    const updated = await env.DB
      .prepare('SELECT * FROM orthocare_clinic_enquiries WHERE id = ?')
      .bind(id)
      .first<StoredEnquiry>();
    if (!updated) throw new Error('Updated enquiry could not be read from D1.');
    return json(mapEnquiry(updated));
  }
  if (resource === 'enquiries' && id && method === 'DELETE') {
    const deleted = await env.DB
      .prepare('DELETE FROM orthocare_clinic_enquiries WHERE id = ?')
      .bind(id)
      .run();
    return (deleted.meta?.changes || 0) > 0
      ? json({ success: true })
      : json({ error: 'Enquiry not found' }, 404);
  }

  if (resource === 'upload' && method === 'POST') {
    return json({
      error: 'Image uploads are temporarily unavailable. Use an existing static image path, such as /images/clinic_treatment_room_1793268957681.jpg.',
    }, 503);
  }

  if (resource === 'stats' && method === 'GET') {
    const database = await getDatabase(env);
    const [counts, recent] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) AS contacted_count,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_count
        FROM orthocare_clinic_enquiries`).first<{
          total: number;
          new_count: number;
          contacted_count: number;
          scheduled_count: number;
        }>(),
      env.DB.prepare('SELECT * FROM orthocare_clinic_enquiries ORDER BY created_at DESC, id DESC LIMIT 5')
        .all<StoredEnquiry>(),
    ]);
    return json({
      servicesCount: database.services.length,
      visibleServicesCount: database.services.filter((service) => service.isVisible).length,
      categoriesCount: database.categories.length,
      galleryCount: database.gallery.length,
      faqsCount: database.faqs.length,
      totalEnquiries: Number(counts?.total || 0),
      newEnquiries: Number(counts?.new_count || 0),
      contactedEnquiries: Number(counts?.contacted_count || 0),
      scheduledEnquiries: Number(counts?.scheduled_count || 0),
      recentEnquiries: (recent.results || []).map(mapEnquiry),
    });
  }

  return json({ error: 'API route not found' }, 404);
}

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  let response: Response;
  try {
    response = await handleApi(request, env);
  } catch (error) {
    console.error('Cloudflare API request failed:', error);
    response = error instanceof ApiError
      ? json({ error: error.message }, error.status)
      : json({ error: 'The request could not be completed. Please try again.' }, 500);
  }

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
