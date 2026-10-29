import { ClinicSettings, ClinicContent, ServiceCategory, TreatmentService, GalleryItem, FAQItem, PatientEnquiry, AdminStats } from './types';

const TOKEN_KEY = 'orthocare_admin_token';
const FALLBACK_DATA_PATH = '/site-data.json';

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function readJsonWithFallback<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    return await readJson<T>(url, init);
  } catch (error) {
    const fallback = await readJson<Record<string, any>>(FALLBACK_DATA_PATH);
    if (url === '/api/settings') return (fallback.settings ?? fallback) as T;
    if (url === '/api/content') return (fallback.content ?? fallback) as T;
    if (url === '/api/categories') return (fallback.categories ?? []) as T;
    if (url === '/api/services' || url.startsWith('/api/services?')) return (fallback.services ?? []) as T;
    if (url === '/api/gallery' || url.startsWith('/api/gallery?')) return (fallback.gallery ?? []) as T;
    if (url === '/api/faqs' || url.startsWith('/api/faqs?')) return (fallback.faqs ?? []) as T;
    throw error;
  }
}

export const api = {
  // Auth token helpers
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = ['Bearer', token].join(' ');
    }
    return headers;
  },

  // Public & Shared
  async getSettings(): Promise<ClinicSettings> {
    return readJsonWithFallback<ClinicSettings>('/api/settings');
  },

  async getContent(): Promise<ClinicContent> {
    return readJsonWithFallback<ClinicContent>('/api/content');
  },

  async getCategories(): Promise<ServiceCategory[]> {
    return readJsonWithFallback<ServiceCategory[]>('/api/categories');
  },

  async getServices(all = false): Promise<TreatmentService[]> {
    const url = all ? '/api/services?all=true' : '/api/services';
    return readJsonWithFallback<TreatmentService[]>(url, { headers: this.getHeaders() });
  },

  async getGallery(all = false): Promise<GalleryItem[]> {
    const url = all ? '/api/gallery?all=true' : '/api/gallery';
    return readJsonWithFallback<GalleryItem[]>(url, { headers: this.getHeaders() });
  },

  async getFaqs(all = false): Promise<FAQItem[]> {
    const url = all ? '/api/faqs?all=true' : '/api/faqs';
    return readJsonWithFallback<FAQItem[]>(url, { headers: this.getHeaders() });
  },

  async submitEnquiry(enquiry: {
    patientName: string;
    phoneNumber: string;
    serviceRequested: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    message?: string;
    isHomeVisitRequested: boolean;
  }): Promise<{ success: boolean; message: string; enquiryId?: string }> {
    const res = await fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit enquiry');
    return data;
  },

  // Admin Auth
  async login(password: string): Promise<{ success: boolean; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this.setToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } finally {
      this.clearToken();
    }
  },

  async checkAuth(): Promise<boolean> {
    const token = this.getToken();
    if (!token) return false;
    try {
      const res = await fetch('/api/auth/me', { headers: this.getHeaders() });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.authenticated);
    } catch {
      return false;
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
  },

  // Admin Stats
  async getStats(): Promise<AdminStats> {
    const res = await fetch('/api/stats', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  // Admin Settings & Content
  async updateSettings(settings: Partial<ClinicSettings>): Promise<ClinicSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data.settings;
  },

  async updateContent(content: Partial<ClinicContent>): Promise<ClinicContent> {
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(content),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update content');
    return data.content;
  },

  // Admin Services
  async createService(service: Omit<TreatmentService, 'id'>): Promise<TreatmentService> {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(service),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create service');
    return data;
  },

  async updateService(id: string, updates: Partial<TreatmentService>): Promise<TreatmentService> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update service');
    return data;
  },

  async deleteService(id: string): Promise<void> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete service');
  },

  // Admin Categories
  async createCategory(category: Omit<ServiceCategory, 'id'>): Promise<ServiceCategory> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(category),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create category');
    return data;
  },

  async updateCategory(id: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update category');
    return data;
  },

  async deleteCategory(id: string, fallbackCategoryId?: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ fallbackCategoryId }),
    });
    if (!res.ok) throw new Error('Failed to delete category');
  },

  // Admin Gallery
  async createGalleryItem(item: Omit<GalleryItem, 'id'>): Promise<GalleryItem> {
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add gallery item');
    return data;
  },

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<GalleryItem> {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update gallery item');
    return data;
  },

  async deleteGalleryItem(id: string): Promise<void> {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete gallery item');
  },

  // Admin FAQs
  async createFaq(faq: Omit<FAQItem, 'id'>): Promise<FAQItem> {
    const res = await fetch('/api/faqs', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(faq),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create FAQ');
    return data;
  },

  async updateFaq(id: string, updates: Partial<FAQItem>): Promise<FAQItem> {
    const res = await fetch(`/api/faqs/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update FAQ');
    return data;
  },

  async deleteFaq(id: string): Promise<void> {
    const res = await fetch(`/api/faqs/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete FAQ');
  },

  // Admin Enquiries
  async getEnquiries(): Promise<PatientEnquiry[]> {
    const res = await fetch('/api/enquiries', { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch enquiries');
    return res.json();
  },

  async updateEnquiryStatus(id: string, status: PatientEnquiry['status'], internalNotes?: string): Promise<PatientEnquiry> {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status, internalNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update enquiry status');
    return data;
  },

  async deleteEnquiry(id: string): Promise<void> {
    const res = await fetch(`/api/enquiries/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete enquiry');
  },

  // Image Upload (Base64)
  async uploadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
              fileData: base64Data,
              fileName: file.name,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to upload image');
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  },
};
