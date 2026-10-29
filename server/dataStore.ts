import fs from 'fs';
import path from 'path';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { ClinicDatabase, PatientEnquiry, ServiceCategory, TreatmentService, GalleryItem, FAQItem } from './types';
import { defaultDatabase, hashPassword, generateSalt } from './seedData';
import { D1Config, getD1Config, queryD1 } from './d1Client';
import { getAdminPasswordPolicyError } from '../src/authPolicy';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'clinic_data.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');
const MAX_WRITE_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const ENQUIRY_WINDOW_MS = 15 * 60 * 1000;
const ENQUIRY_MAX_SUBMISSIONS = 5;

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let d1Config: D1Config | null = null;
let inMemoryDb: ClinicDatabase = defaultDatabase;
const activeSessions = new Map<string, { expiresAt: number }>();
const loginAttempts = new Map<string, { windowStartedAt: number; attempts: number; lockedUntil: number }>();
const enquiryAttempts = new Map<string, { windowStartedAt: number; attempts: number }>();

function normalizeDatabase(parsed: Partial<ClinicDatabase>): ClinicDatabase {
  return {
    ...defaultDatabase,
    ...parsed,
    settings: { ...defaultDatabase.settings, ...(parsed.settings || {}) },
    content: { ...defaultDatabase.content, ...(parsed.content || {}) },
    categories: Array.isArray(parsed.categories) ? parsed.categories : defaultDatabase.categories,
    services: Array.isArray(parsed.services) ? parsed.services : defaultDatabase.services,
    gallery: Array.isArray(parsed.gallery) ? parsed.gallery : defaultDatabase.gallery,
    faqs: Array.isArray(parsed.faqs) ? parsed.faqs : defaultDatabase.faqs,
    enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : [],
  };
}

function loadLocalDatabase(): ClinicDatabase {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return normalizeDatabase(JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Partial<ClinicDatabase>);
    }
  } catch (error) {
    console.error('Failed to read clinic_data.json:', error);
    throw new Error('The local clinic database could not be read.');
  }

  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialAdminPassword || getAdminPasswordPolicyError(initialAdminPassword)) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD to a unique password between 12 and 128 characters before creating a new clinic database.');
  }

  saveLocalDatabase(defaultDatabase);
  return { ...defaultDatabase };
}

function saveLocalDatabase(db: ClinicDatabase): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function parseRemoteDatabase(data: string): ClinicDatabase {
  try {
    const parsed: unknown = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid clinic state shape.');
    }
    const database = parsed as Partial<ClinicDatabase>;
    if (typeof database.adminSalt !== 'string' || typeof database.adminPasswordHash !== 'string') {
      throw new Error('Clinic administrator credentials are missing from D1 state.');
    }
    return normalizeDatabase(database);
  } catch {
    throw new Error('The clinic state stored in Cloudflare D1 is invalid or incomplete.');
  }
}

function getId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isPasswordMatch(candidate: string, salt: string, expectedHash: string): boolean {
  const candidateHash = Buffer.from(hashPassword(candidate, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return candidateHash.length === expected.length && timingSafeEqual(candidateHash, expected);
}

async function readRemoteState(): Promise<{ revision: number; database: ClinicDatabase } | null> {
  if (!d1Config) throw new Error('Cloudflare D1 is not configured.');
  const { results } = await queryD1<{ revision: number; data: string }>(
    d1Config,
    'SELECT revision, data FROM orthocare_clinic_state WHERE id = 1'
  );
  const row = results[0];
  return row ? { revision: Number(row.revision), database: parseRemoteDatabase(row.data) } : null;
}

async function mutateDatabase<T>(mutator: (database: ClinicDatabase) => T): Promise<T> {
  if (!d1Config) {
    const database = JSON.parse(JSON.stringify(inMemoryDb)) as ClinicDatabase;
    const result = mutator(database);
    if (result === null || result === false) return result;
    saveLocalDatabase(database);
    inMemoryDb = database;
    return result;
  }

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const current = await readRemoteState();
    if (!current) throw new Error('Cloudflare D1 clinic state was not initialized.');
    const database = current.database;
    const result = mutator(database);
    if (result === null || result === false) {
      inMemoryDb = database;
      return result;
    }
    const update = await queryD1(
      d1Config,
      'UPDATE orthocare_clinic_state SET revision = ?, data = ? WHERE id = 1 AND revision = ?',
      [current.revision + 1, JSON.stringify(database), current.revision]
    );
    if (update.changes === 1) {
      inMemoryDb = database;
      return result;
    }
  }

  throw new Error('Clinic data changed concurrently too many times. Please retry the request.');
}

async function readDatabase(): Promise<ClinicDatabase> {
  if (!d1Config) return inMemoryDb;
  const current = await readRemoteState();
  if (!current) throw new Error('Cloudflare D1 clinic state was not initialized.');
  inMemoryDb = current.database;
  return current.database;
}

export const DataStore = {
  async initialize(): Promise<void> {
    d1Config = getD1Config();
    if (!d1Config) {
      inMemoryDb = loadLocalDatabase();
      console.log('Using local clinic_data.json storage.');
      return;
    }

    await queryD1(
      d1Config,
      'CREATE TABLE IF NOT EXISTS orthocare_clinic_state (id INTEGER PRIMARY KEY CHECK (id = 1), revision INTEGER NOT NULL, data TEXT NOT NULL)'
    );
    await queryD1(
      d1Config,
      'CREATE TABLE IF NOT EXISTS orthocare_clinic_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)'
    );
    await queryD1(
      d1Config,
      'CREATE TABLE IF NOT EXISTS orthocare_clinic_login_attempts (ip_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, attempts INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0)'
    );
    await queryD1(
      d1Config,
      'CREATE TABLE IF NOT EXISTS orthocare_clinic_enquiry_attempts (ip_hash TEXT PRIMARY KEY, window_started_at INTEGER NOT NULL, attempts INTEGER NOT NULL)'
    );

    let current = await readRemoteState();
    if (!current) {
      const password = process.env.ADMIN_INITIAL_PASSWORD;
      if (!password || getAdminPasswordPolicyError(password)) {
        throw new Error('Set ADMIN_INITIAL_PASSWORD to a unique password between 12 and 128 characters before initializing the Cloudflare D1 database.');
      }

      const salt = generateSalt();
      const seed: ClinicDatabase = {
        ...defaultDatabase,
        adminSalt: salt,
        adminPasswordHash: hashPassword(password, salt),
      };
      await queryD1(
        d1Config,
        'INSERT OR IGNORE INTO orthocare_clinic_state (id, revision, data) VALUES (1, 1, ?)',
        [JSON.stringify(seed)]
      );
      current = await readRemoteState();
      if (!current) throw new Error('Cloudflare D1 database initialization did not create clinic state.');
    }

    inMemoryDb = current.database;
    console.log(`Using Cloudflare D1 database ${process.env.CLOUDFLARE_D1_DATABASE_NAME || d1Config.databaseId}.`);
  },

  async get(): Promise<ClinicDatabase> {
    return readDatabase();
  },

  async updateSettings(settings: Partial<ClinicDatabase['settings']>): Promise<ClinicDatabase['settings']> {
    return mutateDatabase((database) => {
      database.settings = { ...database.settings, ...settings };
      return database.settings;
    });
  },

  async updateContent(content: Partial<ClinicDatabase['content']>): Promise<ClinicDatabase['content']> {
    return mutateDatabase((database) => {
      database.content = { ...database.content, ...content };
      return database.content;
    });
  },

  async getCategories(): Promise<ServiceCategory[]> {
    const database = await readDatabase();
    return [...database.categories].sort((a, b) => a.order - b.order);
  },

  async addCategory(category: Omit<ServiceCategory, 'id'>): Promise<ServiceCategory> {
    return mutateDatabase((database) => {
      const created = { ...category, id: getId('cat') };
      database.categories.push(created);
      return created;
    });
  },

  async updateCategory(id: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory | null> {
    return mutateDatabase((database) => {
      const index = database.categories.findIndex((category) => category.id === id);
      if (index === -1) return null;
      database.categories[index] = { ...database.categories[index], ...updates, id };
      return database.categories[index];
    });
  },

  async deleteCategory(id: string, fallbackCategoryId?: string): Promise<boolean> {
    return mutateDatabase((database) => {
      const index = database.categories.findIndex((category) => category.id === id);
      if (index === -1) return false;
      const targetId = fallbackCategoryId || database.categories.find((category) => category.id !== id)?.id || 'cat-general';
      database.services = database.services.map((service) =>
        service.categoryId === id ? { ...service, categoryId: targetId } : service
      );
      database.categories.splice(index, 1);
      return true;
    });
  },

  async getServices(all = false): Promise<TreatmentService[]> {
    const database = await readDatabase();
    const services = all ? database.services : database.services.filter((service) => service.isVisible);
    return [...services].sort((a, b) => a.order - b.order);
  },

  async addService(service: Omit<TreatmentService, 'id'>): Promise<TreatmentService> {
    return mutateDatabase((database) => {
      const created = { ...service, id: getId('srv') };
      database.services.push(created);
      return created;
    });
  },

  async updateService(id: string, updates: Partial<TreatmentService>): Promise<TreatmentService | null> {
    return mutateDatabase((database) => {
      const index = database.services.findIndex((service) => service.id === id);
      if (index === -1) return null;
      database.services[index] = { ...database.services[index], ...updates, id };
      return database.services[index];
    });
  },

  async deleteService(id: string): Promise<boolean> {
    return mutateDatabase((database) => {
      const index = database.services.findIndex((service) => service.id === id);
      if (index === -1) return false;
      database.services.splice(index, 1);
      return true;
    });
  },

  async getGallery(all = false): Promise<GalleryItem[]> {
    const database = await readDatabase();
    const gallery = all ? database.gallery : database.gallery.filter((item) => item.isVisible);
    return [...gallery].sort((a, b) => a.order - b.order);
  },

  async addGalleryItem(item: Omit<GalleryItem, 'id'>): Promise<GalleryItem> {
    return mutateDatabase((database) => {
      const created = { ...item, id: getId('gal') };
      database.gallery.push(created);
      return created;
    });
  },

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<GalleryItem | null> {
    return mutateDatabase((database) => {
      const index = database.gallery.findIndex((item) => item.id === id);
      if (index === -1) return null;
      database.gallery[index] = { ...database.gallery[index], ...updates, id };
      return database.gallery[index];
    });
  },

  async deleteGalleryItem(id: string): Promise<boolean> {
    return mutateDatabase((database) => {
      const index = database.gallery.findIndex((item) => item.id === id);
      if (index === -1) return false;
      database.gallery.splice(index, 1);
      return true;
    });
  },

  async getFAQs(all = false): Promise<FAQItem[]> {
    const database = await readDatabase();
    const faqs = all ? database.faqs : database.faqs.filter((faq) => faq.isVisible);
    return [...faqs].sort((a, b) => a.order - b.order);
  },

  async addFAQ(faq: Omit<FAQItem, 'id'>): Promise<FAQItem> {
    return mutateDatabase((database) => {
      const created = { ...faq, id: getId('faq') };
      database.faqs.push(created);
      return created;
    });
  },

  async updateFAQ(id: string, updates: Partial<FAQItem>): Promise<FAQItem | null> {
    return mutateDatabase((database) => {
      const index = database.faqs.findIndex((faq) => faq.id === id);
      if (index === -1) return null;
      database.faqs[index] = { ...database.faqs[index], ...updates, id };
      return database.faqs[index];
    });
  },

  async deleteFAQ(id: string): Promise<boolean> {
    return mutateDatabase((database) => {
      const index = database.faqs.findIndex((faq) => faq.id === id);
      if (index === -1) return false;
      database.faqs.splice(index, 1);
      return true;
    });
  },

  async getEnquiries(): Promise<PatientEnquiry[]> {
    const database = await readDatabase();
    return [...database.enquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async addEnquiry(enquiry: {
    patientName: string;
    phoneNumber: string;
    serviceRequested: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    message?: string;
    isHomeVisitRequested: boolean;
  }): Promise<PatientEnquiry> {
    return mutateDatabase((database) => {
      const now = new Date().toISOString();
      const created: PatientEnquiry = {
        ...enquiry,
        id: getId('enq'),
        status: 'new',
        createdAt: now,
        updatedAt: now,
      };
      database.enquiries.unshift(created);
      return created;
    });
  },

  async consumeEnquirySubmission(clientKey: string): Promise<number> {
    const keyHash = hashSessionToken(`public-enquiry:${clientKey}`);
    const now = Date.now();
    let attempts: number;
    let windowStartedAt: number;

    if (d1Config) {
      const { results } = await queryD1<{ attempts: number; window_started_at: number }>(
        d1Config,
        `INSERT INTO orthocare_clinic_enquiry_attempts (ip_hash, window_started_at, attempts)
         VALUES (?, ?, 1)
         ON CONFLICT(ip_hash) DO UPDATE SET
           attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE attempts + 1 END,
           window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END
         RETURNING attempts, window_started_at`,
        [keyHash, now, now - ENQUIRY_WINDOW_MS, now - ENQUIRY_WINDOW_MS]
      );
      if (!results[0]) throw new Error('D1 did not return the enquiry rate-limit result.');
      attempts = Number(results[0].attempts);
      windowStartedAt = Number(results[0].window_started_at);
    } else {
      let current = enquiryAttempts.get(keyHash);
      if (!current || current.windowStartedAt <= now - ENQUIRY_WINDOW_MS) {
        current = { windowStartedAt: now, attempts: 0 };
        enquiryAttempts.set(keyHash, current);
      }
      current.attempts += 1;
      attempts = current.attempts;
      windowStartedAt = current.windowStartedAt;

      if (enquiryAttempts.size > 10000) {
        for (const [key, entry] of enquiryAttempts) {
          if (entry.windowStartedAt <= now - ENQUIRY_WINDOW_MS) enquiryAttempts.delete(key);
        }
      }
    }

    if (attempts <= ENQUIRY_MAX_SUBMISSIONS) return 0;
    return Math.max(1, Math.ceil((windowStartedAt + ENQUIRY_WINDOW_MS - now) / 1000));
  },

  async updateEnquiryStatus(
    id: string,
    status: PatientEnquiry['status'],
    internalNotes?: string
  ): Promise<PatientEnquiry | null> {
    return mutateDatabase((database) => {
      const enquiry = database.enquiries.find((item) => item.id === id);
      if (!enquiry) return null;
      enquiry.status = status;
      if (internalNotes !== undefined) enquiry.internalNotes = internalNotes;
      enquiry.updatedAt = new Date().toISOString();
      return enquiry;
    });
  },

  async deleteEnquiry(id: string): Promise<boolean> {
    return mutateDatabase((database) => {
      const index = database.enquiries.findIndex((enquiry) => enquiry.id === id);
      if (index === -1) return false;
      database.enquiries.splice(index, 1);
      return true;
    });
  },

  async verifyPassword(candidate: string): Promise<boolean> {
    const database = await readDatabase();
    return isPasswordMatch(candidate, database.adminSalt, database.adminPasswordHash);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    const changed = await mutateDatabase((database) => {
      if (!isPasswordMatch(currentPassword, database.adminSalt, database.adminPasswordHash)) return false;
      const salt = generateSalt();
      database.adminSalt = salt;
      database.adminPasswordHash = hashPassword(newPassword, salt);
      return true;
    });
    if (changed) {
      if (d1Config) {
        await queryD1(d1Config, 'DELETE FROM orthocare_clinic_sessions');
      } else {
        activeSessions.clear();
      }
    }
    return changed;
  },

  async getLoginRetryAfter(clientKey: string): Promise<number> {
    const keyHash = hashSessionToken(`admin-login:${clientKey}`);
    let lockedUntil: number | undefined;
    if (d1Config) {
      const { results } = await queryD1<{ locked_until: number }>(
        d1Config,
        'SELECT locked_until FROM orthocare_clinic_login_attempts WHERE ip_hash = ?',
        [keyHash]
      );
      lockedUntil = results[0]?.locked_until;
    } else {
      lockedUntil = loginAttempts.get(keyHash)?.lockedUntil;
    }
    return lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;
  },

  async recordLoginFailure(clientKey: string): Promise<number> {
    const keyHash = hashSessionToken(`admin-login:${clientKey}`);
    const now = Date.now();
    if (d1Config) {
      await queryD1(
        d1Config,
        `INSERT INTO orthocare_clinic_login_attempts (ip_hash, window_started_at, attempts, locked_until)
         VALUES (?, ?, 1, 0)
         ON CONFLICT(ip_hash) DO UPDATE SET
           attempts = CASE WHEN window_started_at <= ? THEN 1 ELSE attempts + 1 END,
           window_started_at = CASE WHEN window_started_at <= ? THEN excluded.window_started_at ELSE window_started_at END,
           locked_until = CASE
             WHEN window_started_at <= ? THEN 0
             WHEN attempts + 1 >= ? THEN excluded.window_started_at + ?
             ELSE locked_until
           END`,
        [keyHash, now, now - LOGIN_WINDOW_MS, now - LOGIN_WINDOW_MS, now - LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS]
      );
    } else {
      const current = loginAttempts.get(keyHash);
      if (!current || current.windowStartedAt <= now - LOGIN_WINDOW_MS) {
        loginAttempts.set(keyHash, { windowStartedAt: now, attempts: 1, lockedUntil: 0 });
      } else {
        current.attempts += 1;
        if (current.attempts >= LOGIN_MAX_ATTEMPTS) current.lockedUntil = current.windowStartedAt + LOGIN_WINDOW_MS;
      }
    }
    return this.getLoginRetryAfter(clientKey);
  },

  async clearLoginFailures(clientKey: string): Promise<void> {
    const keyHash = hashSessionToken(`admin-login:${clientKey}`);
    if (d1Config) {
      await queryD1(d1Config, 'DELETE FROM orthocare_clinic_login_attempts WHERE ip_hash = ?', [keyHash]);
    } else {
      loginAttempts.delete(keyHash);
    }
  },

  async createSession(): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    if (d1Config) {
      await queryD1(
        d1Config,
        'INSERT INTO orthocare_clinic_sessions (token_hash, expires_at) VALUES (?, ?)',
        [hashSessionToken(token), expiresAt]
      );
    } else {
      activeSessions.set(token, { expiresAt });
    }
    return token;
  },

  async validateSession(token?: string): Promise<boolean> {
    if (!token) return false;
    const tokenHash = hashSessionToken(token);
    if (d1Config) {
      const { results } = await queryD1<{ expires_at: number }>(
        d1Config,
        'SELECT expires_at FROM orthocare_clinic_sessions WHERE token_hash = ?',
        [tokenHash]
      );
      const session = results[0];
      if (!session) return false;
      if (Number(session.expires_at) < Date.now()) {
        await queryD1(d1Config, 'DELETE FROM orthocare_clinic_sessions WHERE token_hash = ?', [tokenHash]);
        return false;
      }
      return true;
    }

    const session = activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return false;
    }
    return true;
  },

  async destroySession(token?: string): Promise<void> {
    if (!token) return;
    if (d1Config) {
      await queryD1(d1Config, 'DELETE FROM orthocare_clinic_sessions WHERE token_hash = ?', [hashSessionToken(token)]);
      return;
    }
    activeSessions.delete(token);
  },

  saveUploadedImage(base64Data: string, originalName: string): string {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const extension = originalName.split('.').pop() || 'jpg';
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension.toLowerCase())
      ? extension.toLowerCase()
      : 'jpg';
    const filename = `orthocare_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${safeExtension}`;
    const filePath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(matches?.[2] || base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  },
};
