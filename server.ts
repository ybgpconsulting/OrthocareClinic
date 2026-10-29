import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DataStore } from './server/dataStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Request body parsers (supports base64 image uploads up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve uploaded files statically
const publicUploads = path.resolve(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}
app.use('/uploads', express.static(publicUploads));

// Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (req.query.token as string);

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
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  const isValid = await DataStore.verifyPassword(password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password. Please enter the correct admin password.' });
  }

  const token = await DataStore.createSession();
  res.json({ success: true, token, message: 'Logged in successfully' });
}));

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  void DataStore.destroySession(token).then(() => {
    res.json({ success: true, message: 'Logged out successfully' });
  }).catch((error) => {
    console.error('Failed to destroy admin session:', error);
    res.status(500).json({ error: 'Failed to log out. Please try again.' });
  });
});

app.get('/api/auth/me', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
  const isValid = await DataStore.validateSession(token);
  res.json({ authenticated: isValid });
}));

app.post('/api/auth/change-password', requireAdmin, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const changed = await DataStore.changePassword(currentPassword, newPassword);
  if (!changed) {
    return res.status(400).json({ error: 'Current password was incorrect' });
  }

  res.json({ success: true, message: 'Admin password updated successfully' });
}));

// Settings
app.get('/api/settings', asyncHandler(async (_req, res) => {
  res.json((await DataStore.get()).settings);
}));

app.put('/api/settings', requireAdmin, asyncHandler(async (req, res) => {
  const updated = await DataStore.updateSettings(req.body);
  res.json({ success: true, settings: updated });
}));

// Content
app.get('/api/content', asyncHandler(async (_req, res) => {
  res.json((await DataStore.get()).content);
}));

app.put('/api/content', requireAdmin, asyncHandler(async (req, res) => {
  const updated = await DataStore.updateContent(req.body);
  res.json({ success: true, content: updated });
}));

// Categories
app.get('/api/categories', asyncHandler(async (_req, res) => {
  res.json(await DataStore.getCategories());
}));

app.post('/api/categories', requireAdmin, asyncHandler(async (req, res) => {
  const { name, nameHi, order, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  const created = await DataStore.addCategory({
    name,
    nameHi: nameHi || name,
    order: order || 99,
    description: description || ''
  });
  res.status(201).json(created);
}));

app.put('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const updated = await DataStore.updateCategory(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Category not found' });
  res.json(updated);
}));

app.delete('/api/categories/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { fallbackCategoryId } = req.body || {};
  const success = await DataStore.deleteCategory(req.params.id, fallbackCategoryId);
  if (!success) return res.status(404).json({ error: 'Category not found' });
  res.json({ success: true, message: 'Category deleted and services safely reassigned' });
}));

// Services
app.get('/api/services', asyncHandler(async (req, res) => {
  const includeHidden = req.query.all === 'true';
  // If requesting hidden, check admin token
  if (includeHidden) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (await DataStore.validateSession(token)) {
      return res.json(await DataStore.getServices(true));
    }
  }
  res.json(await DataStore.getServices(false));
}));

app.post('/api/services', requireAdmin, asyncHandler(async (req, res) => {
  const { name, categoryId, description } = req.body;
  if (!name || !categoryId || !description) {
    return res.status(400).json({ error: 'Name, category and description are required' });
  }
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
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (await DataStore.validateSession(token)) {
      return res.json(await DataStore.getGallery(true));
    }
  }
  res.json(await DataStore.getGallery(false));
}));

app.post('/api/gallery', requireAdmin, asyncHandler(async (req, res) => {
  const { title, url, category, alt, caption } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: 'Title and image URL are required' });
  }
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
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    if (await DataStore.validateSession(token)) {
      return res.json(await DataStore.getFAQs(true));
    }
  }
  res.json(await DataStore.getFAQs(false));
}));

app.post('/api/faqs', requireAdmin, asyncHandler(async (req, res) => {
  const { question, answer, category, order } = req.body;
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required' });
  }
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
  const { patientName, phoneNumber, serviceRequested, preferredDate, preferredTimeSlot, message, isHomeVisitRequested } = req.body;

  // Validation
  if (!patientName || typeof patientName !== 'string' || patientName.trim().length < 2) {
    return res.status(400).json({ error: 'Please provide a valid patient name' });
  }
  const cleanPhone = (phoneNumber || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: 'Please provide a valid 10-digit mobile number' });
  }

  const created = await DataStore.addEnquiry({
    patientName: patientName.trim(),
    phoneNumber: cleanPhone,
    serviceRequested: serviceRequested || 'General Physiotherapy Consultation',
    preferredDate: preferredDate || '',
    preferredTimeSlot: preferredTimeSlot || '',
    message: message || '',
    isHomeVisitRequested: Boolean(isHomeVisitRequested)
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
  const { status, internalNotes } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  const updated = await DataStore.updateEnquiryStatus(req.params.id, status, internalNotes);
  if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
  res.json(updated);
}));

app.delete('/api/enquiries/:id', requireAdmin, asyncHandler(async (req, res) => {
  const success = await DataStore.deleteEnquiry(req.params.id);
  if (!success) return res.status(404).json({ error: 'Enquiry not found' });
  res.json({ success: true });
}));

// File upload endpoint (Admin only)
app.post('/api/upload', requireAdmin, (req, res) => {
  const { fileData, fileName } = req.body;
  if (!fileData) {
    return res.status(400).json({ error: 'File data is required' });
  }

  try {
    const url = DataStore.saveUploadedImage(fileData, fileName || 'upload.jpg');
    res.json({ success: true, url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
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
