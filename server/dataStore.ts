import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ClinicDatabase, PatientEnquiry, ServiceCategory, TreatmentService, GalleryItem, FAQItem } from './types';
import { defaultDatabase, hashPassword, generateSalt } from './seedData';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'clinic_data.json');
const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

let inMemoryDb: ClinicDatabase;

function loadDatabase(): ClinicDatabase {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content) as ClinicDatabase;
      
      // Ensure all required top-level collections exist
      return {
        ...defaultDatabase,
        ...parsed,
        settings: { ...defaultDatabase.settings, ...(parsed.settings || {}) },
        content: { ...defaultDatabase.content, ...(parsed.content || {}) },
        categories: parsed.categories?.length ? parsed.categories : defaultDatabase.categories,
        services: parsed.services?.length ? parsed.services : defaultDatabase.services,
        gallery: parsed.gallery?.length ? parsed.gallery : defaultDatabase.gallery,
        faqs: parsed.faqs?.length ? parsed.faqs : defaultDatabase.faqs,
        enquiries: Array.isArray(parsed.enquiries) ? parsed.enquiries : []
      };
    }
  } catch (err) {
    console.error('Failed to read clinic_data.json, falling back to default:', err);
  }
  
  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialAdminPassword || initialAdminPassword.length < 12) {
    throw new Error('Set ADMIN_INITIAL_PASSWORD to a unique password of at least 12 characters before creating a new clinic database.');
  }

  // Write initial seed
  saveDatabase(defaultDatabase);
  return { ...defaultDatabase };
}

function saveDatabase(db: ClinicDatabase): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save clinic_data.json:', err);
  }
}

inMemoryDb = loadDatabase();

// Active admin sessions: token -> { createdAt: number, expiresAt: number }
const activeSessions = new Map<string, { createdAt: number; expiresAt: number }>();

export const DataStore = {
  get(): ClinicDatabase {
    return inMemoryDb;
  },

  updateSettings(settings: Partial<ClinicDatabase['settings']>): ClinicDatabase['settings'] {
    inMemoryDb.settings = { ...inMemoryDb.settings, ...settings };
    saveDatabase(inMemoryDb);
    return inMemoryDb.settings;
  },

  updateContent(content: Partial<ClinicDatabase['content']>): ClinicDatabase['content'] {
    inMemoryDb.content = { ...inMemoryDb.content, ...content };
    saveDatabase(inMemoryDb);
    return inMemoryDb.content;
  },

  // Categories
  getCategories(): ServiceCategory[] {
    return [...inMemoryDb.categories].sort((a, b) => a.order - b.order);
  },

  addCategory(category: Omit<ServiceCategory, 'id'>): ServiceCategory {
    const id = `cat-${Date.now()}`;
    const newCat: ServiceCategory = { ...category, id };
    inMemoryDb.categories.push(newCat);
    saveDatabase(inMemoryDb);
    return newCat;
  },

  updateCategory(id: string, updates: Partial<ServiceCategory>): ServiceCategory | null {
    const idx = inMemoryDb.categories.findIndex((c: ServiceCategory) => c.id === id);
    if (idx === -1) return null;
    inMemoryDb.categories[idx] = { ...inMemoryDb.categories[idx], ...updates, id };
    saveDatabase(inMemoryDb);
    return inMemoryDb.categories[idx];
  },

  deleteCategory(id: string, fallbackCategoryId?: string): boolean {
    const idx = inMemoryDb.categories.findIndex((c: ServiceCategory) => c.id === id);
    if (idx === -1) return false;

    // Handle services assigned to this category
    const targetCatId = fallbackCategoryId || inMemoryDb.categories.find((c: ServiceCategory) => c.id !== id)?.id || 'cat-general';
    inMemoryDb.services = inMemoryDb.services.map((s: TreatmentService) => {
      if (s.categoryId === id) {
        return { ...s, categoryId: targetCatId };
      }
      return s;
    });

    inMemoryDb.categories.splice(idx, 1);
    saveDatabase(inMemoryDb);
    return true;
  },

  // Services
  getServices(all = false): TreatmentService[] {
    const list = all ? inMemoryDb.services : inMemoryDb.services.filter((s: TreatmentService) => s.isVisible);
    return [...list].sort((a, b) => a.order - b.order);
  },

  addService(service: Omit<TreatmentService, 'id'>): TreatmentService {
    const id = `srv-${Date.now()}`;
    const newService: TreatmentService = { ...service, id };
    inMemoryDb.services.push(newService);
    saveDatabase(inMemoryDb);
    return newService;
  },

  updateService(id: string, updates: Partial<TreatmentService>): TreatmentService | null {
    const idx = inMemoryDb.services.findIndex((s: TreatmentService) => s.id === id);
    if (idx === -1) return null;
    inMemoryDb.services[idx] = { ...inMemoryDb.services[idx], ...updates, id };
    saveDatabase(inMemoryDb);
    return inMemoryDb.services[idx];
  },

  deleteService(id: string): boolean {
    const idx = inMemoryDb.services.findIndex((s: TreatmentService) => s.id === id);
    if (idx === -1) return false;
    inMemoryDb.services.splice(idx, 1);
    saveDatabase(inMemoryDb);
    return true;
  },

  // Gallery
  getGallery(all = false): GalleryItem[] {
    const list = all ? inMemoryDb.gallery : inMemoryDb.gallery.filter((g: GalleryItem) => g.isVisible);
    return [...list].sort((a, b) => a.order - b.order);
  },

  addGalleryItem(item: Omit<GalleryItem, 'id'>): GalleryItem {
    const id = `gal-${Date.now()}`;
    const newItem: GalleryItem = { ...item, id };
    inMemoryDb.gallery.push(newItem);
    saveDatabase(inMemoryDb);
    return newItem;
  },

  updateGalleryItem(id: string, updates: Partial<GalleryItem>): GalleryItem | null {
    const idx = inMemoryDb.gallery.findIndex((g: GalleryItem) => g.id === id);
    if (idx === -1) return null;
    inMemoryDb.gallery[idx] = { ...inMemoryDb.gallery[idx], ...updates, id };
    saveDatabase(inMemoryDb);
    return inMemoryDb.gallery[idx];
  },

  deleteGalleryItem(id: string): boolean {
    const idx = inMemoryDb.gallery.findIndex((g: GalleryItem) => g.id === id);
    if (idx === -1) return false;
    inMemoryDb.gallery.splice(idx, 1);
    saveDatabase(inMemoryDb);
    return true;
  },

  // FAQs
  getFAQs(all = false): FAQItem[] {
    const list = all ? inMemoryDb.faqs : inMemoryDb.faqs.filter((f: FAQItem) => f.isVisible);
    return [...list].sort((a, b) => a.order - b.order);
  },

  addFAQ(faq: Omit<FAQItem, 'id'>): FAQItem {
    const id = `faq-${Date.now()}`;
    const newFAQ: FAQItem = { ...faq, id };
    inMemoryDb.faqs.push(newFAQ);
    saveDatabase(inMemoryDb);
    return newFAQ;
  },

  updateFAQ(id: string, updates: Partial<FAQItem>): FAQItem | null {
    const idx = inMemoryDb.faqs.findIndex((f: FAQItem) => f.id === id);
    if (idx === -1) return null;
    inMemoryDb.faqs[idx] = { ...inMemoryDb.faqs[idx], ...updates, id };
    saveDatabase(inMemoryDb);
    return inMemoryDb.faqs[idx];
  },

  deleteFAQ(id: string): boolean {
    const idx = inMemoryDb.faqs.findIndex((f: FAQItem) => f.id === id);
    if (idx === -1) return false;
    inMemoryDb.faqs.splice(idx, 1);
    saveDatabase(inMemoryDb);
    return true;
  },

  // Enquiries
  getEnquiries(): PatientEnquiry[] {
    return [...inMemoryDb.enquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addEnquiry(enquiry: {
    patientName: string;
    phoneNumber: string;
    serviceRequested: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    message?: string;
    isHomeVisitRequested: boolean;
  }): PatientEnquiry {
    const id = `enq-${Date.now()}`;
    const newEnquiry: PatientEnquiry = {
      ...enquiry,
      id,
      status: 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    inMemoryDb.enquiries.unshift(newEnquiry);
    saveDatabase(inMemoryDb);
    return newEnquiry;
  },

  updateEnquiryStatus(id: string, status: PatientEnquiry['status'], internalNotes?: string): PatientEnquiry | null {
    const idx = inMemoryDb.enquiries.findIndex((e: PatientEnquiry) => e.id === id);
    if (idx === -1) return null;
    inMemoryDb.enquiries[idx].status = status;
    if (internalNotes !== undefined) {
      inMemoryDb.enquiries[idx].internalNotes = internalNotes;
    }
    inMemoryDb.enquiries[idx].updatedAt = new Date().toISOString();
    saveDatabase(inMemoryDb);
    return inMemoryDb.enquiries[idx];
  },

  deleteEnquiry(id: string): boolean {
    const idx = inMemoryDb.enquiries.findIndex((e: PatientEnquiry) => e.id === id);
    if (idx === -1) return false;
    inMemoryDb.enquiries.splice(idx, 1);
    saveDatabase(inMemoryDb);
    return true;
  },

  // Authentication & Sessions
  verifyPassword(candidate: string): boolean {
    const computed = hashPassword(candidate, inMemoryDb.adminSalt);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(inMemoryDb.adminPasswordHash));
  },

  changePassword(oldPassword: string, newPassword: string): boolean {
    if (!this.verifyPassword(oldPassword)) {
      return false;
    }
    const newSalt = generateSalt();
    inMemoryDb.adminSalt = newSalt;
    inMemoryDb.adminPasswordHash = hashPassword(newPassword, newSalt);
    saveDatabase(inMemoryDb);
    return true;
  },

  createSession(): string {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    activeSessions.set(token, {
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return token;
  },

  validateSession(token?: string): boolean {
    if (!token) return false;
    const session = activeSessions.get(token);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      activeSessions.delete(token);
      return false;
    }
    return true;
  },

  destroySession(token?: string): void {
    if (token) activeSessions.delete(token);
  },

  // File uploads
  saveUploadedImage(base64Data: string, originalName: string): string {
    // strip header data:image/png;base64,
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const ext = originalName.split('.').pop() || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';
    const filename = `orthocare_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (matches && matches.length === 3) {
      const buffer = Buffer.from(matches[2], 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);
    }

    return `/uploads/${filename}`;
  }
};
