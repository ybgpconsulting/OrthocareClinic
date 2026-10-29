import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DataStore } from './server/dataStore';
import { getAdminPasswordPolicyError } from './src/authPolicy';
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
} from './src/apiValidation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_SESSION_COOKIE = '__Host-orthocare_admin';
const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || !req.path.startsWith('/api/')) {
    next();
    return;
  }
  const origin = req.get('origin');
  if (!origin) {
    next();
    return;
  }
  try {
    const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0].trim();
    const expectedOrigin = `${forwardedProtocol || req.protocol}://${req.get('host')}`;
    if (new URL(origin).origin !== expectedOrigin) {
      res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
      return;
    }
  } catch {
    res.status(403).json({ error: 'Cross-origin requests are not allowed.' });
    return;
  }
  next();
});

// Serve uploaded files statically
const publicUploads = path.resolve(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}
app.use('/uploads', express.static(publicUploads));

// Auth Middleware
function getSessionToken(req: Request): string | undefined {
  const session = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return session && /^[0-9a-f]{64}$/i.test(session) ? session : undefined;
}

function setSessionCookie(res: Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${token}; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`
  );
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
  );
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = getSessionToken(req);

  void DataStore.validateSession(token).then((isValid) => {
    if (!isValid) {
      res.status(401).json({ error: 'Unauthorized: Admin session required or expired' });
      return;
    }
    next();
  }).catch(next);
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Authentication
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, loginRules, ['password']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { password } = req.body;

  const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
  const retryAfter = await DataStore.getLoginRetryAfter(clientKey);
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({ error: 'Too many unsuccessful login attempts. Please try again later.' });
  }

  const isValid = await DataStore.verifyPassword(password);
  if (!isValid) {
    const failureRetryAfter = await DataStore.recordLoginFailure(clientKey);
    if (failureRetryAfter > 0) {
      res.setHeader('Retry-After', String(failureRetryAfter));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(429).json({ error: 'Too many unsuccessful login attempts. Please try again later.' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(401).json({ error: 'Invalid password. Please enter the correct admin password.' });
  }

  await DataStore.clearLoginFailures(clientKey);
  const token = await DataStore.createSession();
  res.setHeader('Cache-Control', 'no-store');
  setSessionCookie(res, token);
  res.json({ success: true, message: 'Logged in successfully' });
}));

app.post('/api/auth/logout', (req, res) => {
  const token = getSessionToken(req);
  void DataStore.destroySession(token).then(() => {
    clearSessionCookie(res);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, message: 'Logged out successfully' });
  }).catch((error) => {
    console.error('Failed to destroy admin session:', error);
    res.status(500).json({ error: 'Failed to log out. Please try again.' });
  });
});

app.get('/api/auth/me', asyncHandler(async (req, res) => {
  const token = getSessionToken(req);
  const isValid = await DataStore.validateSession(token);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ authenticated: isValid });
}));

app.post('/api/auth/change-password', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, passwordChangeRules, ['currentPassword', 'newPassword']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { currentPassword, newPassword } = req.body;
  const passwordError = getAdminPasswordPolicyError(newPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  const changed = await DataStore.changePassword(currentPassword, newPassword);
  if (!changed) {
    return res.status(400).json({ error: 'Current password was incorrect' });
  }

  clearSessionCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true, message: 'Admin password updated successfully. Please sign in again.' });
}));

// Settings
app.get('/api/settings', asyncHandler(async (_req, res) => {
  res.json((await DataStore.get()).settings);
}));

app.put('/api/settings', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, settingsRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateSettings(req.body);
  res.json({ success: true, settings: updated });
}));

// Content
app.get('/api/content', asyncHandler(async (_req, res) => {
  res.json((await DataStore.get()).content);
}));

app.put('/api/content', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, contentRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateContent(req.body);
  res.json({ success: true, content: updated });
}));

// Categories
app.get('/api/categories', asyncHandler(async (_req, res) => {
  res.json(await DataStore.getCategories());
}));

app.post('/api/categories', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, categoryRules, ['name']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { name, nameHi, order, description } = req.body;
  const created = await DataStore.addCategory({
    name,
    nameHi: nameHi || name,
    order: order || 99,
    description: description || ''
  });
  res.status(201).json(created);
}));

app.put('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, categoryRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json(updated);
}));

app.delete('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, deleteCategoryRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const { fallbackCategoryId } = req.body || {};
  const success = await DataStore.deleteCategory(req.params.id, fallbackCategoryId);
  if (!success) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, message: 'Category deleted and services safely reassigned' });
}));

// Services
app.get('/api/services', asyncHandler(async (req, res) => {
  const includeHidden = req.query.all === 'true';
  if (includeHidden) {
    const token = getSessionToken(req);
    if (!await DataStore.validateSession(token)) {
      return res.status(401).json({ error: 'Unauthorized: Admin session required or expired' });
    }
    return res.json(await DataStore.getServices(true));
  }
  res.json(await DataStore.getServices(false));
}));

app.post('/api/services', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, serviceRules, ['name', 'categoryId', 'description']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { name, categoryId, description } = req.body;
  const created = await DataStore.addService({
    name,
    nameHi: req.body.nameHi || name,
    categoryId,
    description,
    descriptionHi: req.body.descriptionHi || description,
    roleOfPhysio: req.body.roleOfPhysio || '',
    roleOfPhysioHi: req.body.roleOfPhysioHi || '',
    commonSymptoms: Array.isArray(req.body.commonSymptoms) ? req.body.commonSymptoms : [],
    durationMinutes: Number(req.body.durationMinutes) || 40,
    priceNote: req.body.priceNote || '',
    homeVisitEligible: Boolean(req.body.homeVisitEligible),
    isVisible: req.body.isVisible !== false,
    order: Number(req.body.order) || 99,
    image: req.body.image || ''
  });
  res.status(201).json(created);
}));

app.put('/api/services/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, serviceRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateService(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Service not found' });
  res.json(updated);
}));

app.delete('/api/services/:id', requireAdmin, asyncHandler(async (req, res) => {
  const success = await DataStore.deleteService(req.params.id);
  if (!success) return res.status(404).json({ error: 'Service not found' });
  res.json({ success: true });
}));

// Gallery
app.get('/api/gallery', asyncHandler(async (req, res) => {
  const includeHidden = req.query.all === 'true';
  if (includeHidden) {
    const token = getSessionToken(req);
    if (!await DataStore.validateSession(token)) {
      return res.status(401).json({ error: 'Unauthorized: Admin session required or expired' });
    }
    return res.json(await DataStore.getGallery(true));
  }
  res.json(await DataStore.getGallery(false));
}));

app.post('/api/gallery', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, galleryRules, ['title', 'url']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { title, url, category, alt, caption } = req.body;
  const created = await DataStore.addGalleryItem({
    title,
    category: category || 'rehabilitation',
    url,
    alt: alt || title,
    caption: caption || '',
    order: Number(req.body.order) || 99,
    isVisible: req.body.isVisible !== false
  });
  res.status(201).json(created);
}));

app.put('/api/gallery/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, galleryRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateGalleryItem(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Gallery item not found' });
  res.json(updated);
}));

app.delete('/api/gallery/:id', requireAdmin, asyncHandler(async (req, res) => {
  const success = await DataStore.deleteGalleryItem(req.params.id);
  if (!success) return res.status(404).json({ error: 'Gallery item not found' });
  res.json({ success: true });
}));

// FAQs
app.get('/api/faqs', asyncHandler(async (req, res) => {
  const includeHidden = req.query.all === 'true';
  if (includeHidden) {
    const token = getSessionToken(req);
    if (!await DataStore.validateSession(token)) {
      return res.status(401).json({ error: 'Unauthorized: Admin session required or expired' });
    }
    return res.json(await DataStore.getFAQs(true));
  }
  res.json(await DataStore.getFAQs(false));
}));

app.post('/api/faqs', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, faqRules, ['question', 'answer']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { question, answer, category, order } = req.body;
  const created = await DataStore.addFAQ({
    question,
    questionHi: req.body.questionHi || question,
    answer,
    answerHi: req.body.answerHi || answer,
    category: category || 'general',
    order: Number(order) || 99,
    isVisible: req.body.isVisible !== false
  });
  res.status(201).json(created);
}));

app.put('/api/faqs/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, faqRules);
  if (validationError) return res.status(400).json({ error: validationError });
  const updated = await DataStore.updateFAQ(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'FAQ not found' });
  res.json(updated);
}));

app.delete('/api/faqs/:id', requireAdmin, asyncHandler(async (req, res) => {
  const success = await DataStore.deleteFAQ(req.params.id);
  if (!success) return res.status(404).json({ error: 'FAQ not found' });
  res.json({ success: true });
}));

// Enquiries
app.post('/api/enquiries', asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, enquiryRules, ['patientName', 'phoneNumber']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { patientName, phoneNumber, serviceRequested, preferredDate, preferredTimeSlot, message, isHomeVisitRequested, website } = req.body;
  if (typeof website === 'string' && website.trim()) {
    return res.status(400).json({ error: 'Unable to submit enquiry. Please review the form and try again.' });
  }
  if (!/^[+\d\s().-]+$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
  }
  const submittedDigits = phoneNumber.replace(/\D/g, '');
  const cleanPhone = submittedDigits.length === 12 && submittedDigits.startsWith('91')
    ? submittedDigits.slice(2)
    : submittedDigits.length === 11 && submittedDigits.startsWith('0')
      ? submittedDigits.slice(1)
      : submittedDigits;
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
  }

  const rateLimitRetryAfter = await DataStore.consumeEnquirySubmission(
    req.ip || req.socket.remoteAddress || 'unknown'
  );
  if (rateLimitRetryAfter > 0) {
    res.setHeader('Retry-After', String(rateLimitRetryAfter));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(429).json({
      error: 'Too many enquiries have been submitted from this connection. Please try again later.',
    });
  }

  const created = await DataStore.addEnquiry({
    patientName: patientName.trim(),
    phoneNumber: cleanPhone,
    serviceRequested: serviceRequested?.trim() || 'General Physiotherapy Consultation',
    preferredDate: preferredDate || '',
    preferredTimeSlot: preferredTimeSlot || '',
    message: message?.trim() || '',
    isHomeVisitRequested: isHomeVisitRequested === true
  });

  res.status(201).json({
    success: true,
    enquiryId: created.id,
    message: 'Your enquiry has been received. Our clinic team will contact you shortly to confirm the appointment.'
  });
}));

app.get('/api/enquiries', requireAdmin, asyncHandler(async (_req, res) => {
  res.json(await DataStore.getEnquiries());
}));

app.patch('/api/enquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const validationError = validatePayload(req.body, enquiryStatusRules, ['status']);
  if (validationError) return res.status(400).json({ error: validationError });
  const { status, internalNotes } = req.body;
  const updated = await DataStore.updateEnquiryStatus(req.params.id, status, internalNotes);
  if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
  res.json(updated);
}));

app.delete('/api/enquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const success = await DataStore.deleteEnquiry(req.params.id);
  if (!success) return res.status(404).json({ error: 'Enquiry not found' });
  res.json({ success: true });
}));

app.post('/api/upload', requireAdmin, (_req, res) => {
  res.status(503).json({
    error: 'Image uploads are temporarily unavailable. Use an existing static image path from /images/.',
  });
});

// Admin Dashboard Stats
app.get('/api/stats', requireAdmin, asyncHandler(async (_req, res) => {
  const db = await DataStore.get();
  const enquiries = db.enquiries || [];
  const newEnquiries = enquiries.filter((e) => (e as any).status === 'new').length;
  const contactedEnquiries = enquiries.filter((e) => (e as any).status === 'contacted').length;
  const scheduledEnquiries = enquiries.filter((e) => (e as any).status === 'scheduled').length;

  res.json({
    servicesCount: db.services.length,
    visibleServicesCount: db.services.filter((s) => (s as any).isVisible).length,
    categoriesCount: db.categories.length,
    galleryCount: db.gallery.length,
    faqsCount: db.faqs.length,
    totalEnquiries: enquiries.length,
    newEnquiries,
    contactedEnquiries,
    scheduledEnquiries,
    recentEnquiries: enquiries.slice(0, 5)
  });
}));

app.use('/api', (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API request failed:', error);
  const status = error && typeof error === 'object' && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  if (status === 413) {
    res.status(413).json({ error: 'Request body exceeds the allowed size.' });
    return;
  }
  if (status === 400) {
    res.status(400).json({ error: 'Request body must contain valid JSON.' });
    return;
  }
  res.status(500).json({ error: 'The request could not be completed. Please try again.' });
});

// ================= FRONTEND / VITE SERVING =================

async function startServer() {
  await DataStore.initialize();
  if (!isProd) {
    // Development mode with Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { extensions: ['html'] }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Orthocare Physiotherapy Clinic server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
