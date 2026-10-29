import seedData from '../../public/site-data.json';
import type {
  FAQItem,
  GalleryItem,
  PatientEnquiry,
  ServiceCategory,
  TreatmentService,
} from '../../src/types';

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  run<T>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1Statement;
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
  adminSalt: string;
  adminPasswordHash: string;
}

interface StoredState {
  revision: number;
  data: string;
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_JSON_BYTES = 28 * 1024 * 1024;

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

function normalizeDatabase(value: unknown): ClinicDatabase {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('D1 clinic state is invalid.');
  }
  const parsed = value as Partial<ClinicDatabase>;
  if (typeof parsed.adminSalt !== 'string' || typeof parsed.adminPasswordHash !== 'string') {
    throw new Error('D1 clinic administrator credentials are missing.');
  }
  return {
    ...seedData,
    ...parsed,
    settings: { ...seedData.settings, ...(parsed.settings || {}) },
    content: { ...seedData.content, ...(parsed.content || {}) },
    categories: Array.isArray(parsed.categories) ? parsed.categories : seedData.categories,
    services: Array.isArray(parsed.services) ? parsed.services : seedData.services,
    gallery: Array.isArray(parsed.gallery) ? parsed.gallery : seedData.gallery,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : seedData.faqs,
    enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
  } as ClinicDatabase;
}

async function hashPassword(password: string, salt: string): Promise<string> {
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
      salt: new Uint8Array(fromHex(salt)),
      iterations: 10_000,
      hash: 'SHA-512',
    },
    key,
    512
  );
  return toHex(new Uint8Array(bits));
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

async function readState(env: Env): Promise<{ revision: number; database: ClinicDatabase } | null> {
  const row = await env.DB
    .prepare('SELECT revision, data FROM orthocare_clinic_state WHERE id = 1')
    .first<StoredState>();
  if (!row) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(row.data);
  } catch {
    throw new Error('D1 clinic state contains invalid JSON.');
  }
  return { revision: Number(row.revision), database: normalizeDatabase(parsed) };
}

async function ensureState(env: Env): Promise<void> {
  if (await readState(env)) return;
  const password = env.ADMIN_INITIAL_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD as a Cloudflare Pages secret (at least 12 characters) before initializing D1.');
  }

  const adminSalt = randomHex(16);
  const database = normalizeDatabase({
    ...seedData,
    enquiries: [],
    adminSalt,
    adminPasswordHash: await hashPassword(password, adminSalt),
  });
  await env.DB
    .prepare('INSERT OR IGNORE INTO orthocare_clinic_state (id, revision, data) VALUES (1, 1, ?)')
    .bind(JSON.stringify(database))
    .run();

  if (!(await readState(env))) {
    throw new Error('D1 clinic data could not be initialized.');
  }
}

async function getDatabase(env: Env): Promise<ClinicDatabase> {
  await ensureState(env);
  const state = await readState(env);
  if (!state) throw new Error('D1 clinic state is unavailable after initialization.');
  return state.database;
}

async function mutateDatabase<T>(
  env: Env,
  mutate: (database: ClinicDatabase) => T | Promise<T>
): Promise<T> {
  await ensureState(env);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const state = await readState(env);
    if (!state) throw new Error('D1 clinic state is not initialized.');
    const database = structuredClone(state.database);
    const result = await mutate(database);
    if (result === null || result === false) return result;
    const update = await env.DB
      .prepare('UPDATE orthocare_clinic_state SET revision = ?, data = ? WHERE id = 1 AND revision = ?')
      .bind(state.revision + 1, JSON.stringify(database), state.revision)
      .run();
    if ((update.meta?.changes || 0) === 1) return result;
  }
  throw new Error('Clinic data changed concurrently too many times. Please retry.');
}

function getToken(request: Request, url: URL): string | undefined {
  const authorization = request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return url.searchParams.get('token') || undefined;
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
  let body: unknown;
  try {
    body = await request.json();
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

function sortEnquiries(items: PatientEnquiry[]): PatientEnquiry[] {
  return [...items].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [resource, id] = segments;
  const method = request.method.toUpperCase();
  const token = getToken(request, url);

  if (method === 'OPTIONS') return new Response(null, { status: 204 });

  if (resource === 'health' && method === 'GET') {
    return json({ status: 'ok', time: new Date().toISOString() });
  }

  if (resource === 'auth' && segments[1] === 'login' && method === 'POST') {
    const body = await readBody(request);
    if (typeof body.password !== 'string' || !body.password) {
      return json({ error: 'Password is required' }, 400);
    }
    const database = await getDatabase(env);
    const actual = fromHex(await hashPassword(body.password, database.adminSalt));
    const expected = fromHex(database.adminPasswordHash);
    if (!constantTimeEqual(actual, expected)) {
      return json({ error: 'Invalid password. Please enter the correct admin password.' }, 401);
    }
    const sessionToken = randomHex(32);
    await env.DB
      .prepare('INSERT INTO orthocare_clinic_sessions (token_hash, expires_at) VALUES (?, ?)')
      .bind(await hashToken(sessionToken), Date.now() + SESSION_TTL_SECONDS * 1000)
      .run();
    return json({ success: true, token: sessionToken, message: 'Logged in successfully' });
  }

  if (resource === 'auth' && segments[1] === 'logout' && method === 'POST') {
    if (token) {
      await env.DB
        .prepare('DELETE FROM orthocare_clinic_sessions WHERE token_hash = ?')
        .bind(await hashToken(token))
        .run();
    }
    return json({ success: true, message: 'Logged out successfully' });
  }

  if (resource === 'auth' && segments[1] === 'me' && method === 'GET') {
    return json({ authenticated: await validateSession(env, token) });
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
    if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
      return json({ error: 'Current and new passwords are required' }, 400);
    }
    if (body.newPassword.length < 6) {
      return json({ error: 'New password must be at least 6 characters' }, 400);
    }
    const changed = await mutateDatabase(env, async (database) => {
      const currentHash = await hashPassword(body.currentPassword, database.adminSalt);
      if (!constantTimeEqual(fromHex(currentHash), fromHex(database.adminPasswordHash))) return false;
      const salt = randomHex(16);
      database.adminSalt = salt;
      database.adminPasswordHash = await hashPassword(body.newPassword, salt);
      return true;
    });
    if (!changed) return json({ error: 'Current password was incorrect' }, 400);
    return json({ success: true, message: 'Admin password updated successfully' });
  }

  if (resource === 'settings' && method === 'PUT') {
    const body = await readBody(request);
    const settings = await mutateDatabase(env, (database) => {
      database.settings = { ...database.settings, ...body };
      return database.settings;
    });
    return json({ success: true, settings });
  }
  if (resource === 'content' && method === 'PUT') {
    const body = await readBody(request);
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
    if (!body.name) return json({ error: 'Category name is required' }, 400);
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
    const updated = await mutateDatabase(env, (database) => {
      const index = database.categories.findIndex((item) => item.id === id);
      if (index < 0) return null;
      database.categories[index] = { ...database.categories[index], ...body, id };
      return database.categories[index];
    });
    return updated ? json(updated) : json({ error: 'Category not found' }, 404);
  }
  if (resource === 'categories' && id && method === 'DELETE') {
    const body = await readBody(request).catch((): Record<string, any> => ({}));
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.categories.findIndex((item) => item.id === id);
      if (index < 0) return false;
      const fallbackId =
        body.fallbackCategoryId ||
        database.categories.find((item) => item.id !== id)?.id ||
        'cat-general';
      database.services = database.services.map((service) =>
        service.categoryId === id ? { ...service, categoryId: fallbackId } : service
      );
      database.categories.splice(index, 1);
      return true;
    });
    return deleted
      ? json({ success: true, message: 'Category deleted and services safely reassigned' })
      : json({ error: 'Category not found' }, 404);
  }

  if (resource === 'services' && method === 'POST') {
    const body = await readBody(request);
    if (!body.name || !body.categoryId || !body.description) {
      return json({ error: 'Name, category and description are required' }, 400);
    }
    const created = await mutateDatabase(env, (database) => {
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
    return json(created, 201);
  }
  if (resource === 'services' && id && method === 'PUT') {
    const body = await readBody(request);
    const updated = await mutateDatabase(env, (database) => {
      const index = database.services.findIndex((item) => item.id === id);
      if (index < 0) return null;
      database.services[index] = { ...database.services[index], ...body, id };
      return database.services[index];
    });
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
    if (!body.title || !body.url) return json({ error: 'Title and image URL are required' }, 400);
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
    if (!body.question || !body.answer) return json({ error: 'Question and answer are required' }, 400);
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
    if (typeof body.patientName !== 'string' || body.patientName.trim().length < 2) {
      return json({ error: 'Please provide a valid patient name' }, 400);
    }
    const phoneNumber = String(body.phoneNumber || '').replace(/\D/g, '');
    if (phoneNumber.length < 10) return json({ error: 'Please provide a valid 10-digit mobile number' }, 400);
    const enquiry = await mutateDatabase(env, (database) => {
      const now = new Date().toISOString();
      const created: PatientEnquiry = {
        id: getId('enq'),
        patientName: body.patientName.trim(),
        phoneNumber,
        serviceRequested: body.serviceRequested || 'General Physiotherapy Consultation',
        preferredDate: body.preferredDate || '',
        preferredTimeSlot: body.preferredTimeSlot || '',
        message: body.message || '',
        isHomeVisitRequested: Boolean(body.isHomeVisitRequested),
        status: 'new',
        createdAt: now,
        updatedAt: now,
      };
      database.enquiries.unshift(created);
      return created;
    });
    return json({
      success: true,
      enquiryId: enquiry.id,
      message: 'Your enquiry has been received. Our clinic team will contact you shortly to confirm the appointment.',
    }, 201);
  }
  if (resource === 'enquiries' && method === 'GET') {
    return json(sortEnquiries((await getDatabase(env)).enquiries));
  }
  if (resource === 'enquiries' && id && method === 'PATCH') {
    const body = await readBody(request);
    const allowedStatuses = ['new', 'contacted', 'scheduled', 'completed', 'closed'];
    if (!allowedStatuses.includes(body.status)) return json({ error: 'A valid status is required' }, 400);
    const updated = await mutateDatabase(env, (database) => {
      const enquiry = database.enquiries.find((item) => item.id === id);
      if (!enquiry) return null;
      enquiry.status = body.status;
      if (body.internalNotes !== undefined) enquiry.internalNotes = body.internalNotes;
      enquiry.updatedAt = new Date().toISOString();
      return enquiry;
    });
    return updated ? json(updated) : json({ error: 'Enquiry not found' }, 404);
  }
  if (resource === 'enquiries' && id && method === 'DELETE') {
    const deleted = await mutateDatabase(env, (database) => {
      const index = database.enquiries.findIndex((item) => item.id === id);
      if (index < 0) return false;
      database.enquiries.splice(index, 1);
      return true;
    });
    return deleted ? json({ success: true }) : json({ error: 'Enquiry not found' }, 404);
  }

  if (resource === 'upload' && method === 'POST') {
    return json({
      error: 'Image uploads are temporarily unavailable. Use an existing static image path, such as /images/clinic_treatment_room_1793268957681.jpg.',
    }, 503);
  }

  if (resource === 'stats' && method === 'GET') {
    const database = await getDatabase(env);
    const enquiries = database.enquiries;
    return json({
      servicesCount: database.services.length,
      visibleServicesCount: database.services.filter((service) => service.isVisible).length,
      categoriesCount: database.categories.length,
      galleryCount: database.gallery.length,
      faqsCount: database.faqs.length,
      totalEnquiries: enquiries.length,
      newEnquiries: enquiries.filter((enquiry) => enquiry.status === 'new').length,
      contactedEnquiries: enquiries.filter((enquiry) => enquiry.status === 'contacted').length,
      scheduledEnquiries: enquiries.filter((enquiry) => enquiry.status === 'scheduled').length,
      recentEnquiries: sortEnquiries(enquiries).slice(0, 5),
    });
  }

  return json({ error: 'API route not found' }, 404);
}

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  try {
    return await handleApi(request, env);
  } catch (error) {
    console.error('Cloudflare API request failed:', error);
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    return json({ error: 'The request could not be completed. Please try again.' }, 500);
  }
}
