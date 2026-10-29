import {
  ClinicSettings,
  ClinicContent,
  ServiceCategory,
  TreatmentService,
  GalleryItem,
  FAQItem,
  PatientEnquiry,
  EnquiryCursor,
  EnquiryPage,
  AdminStats,
} from './types';
import { getAdminPasswordPolicyError } from './authPolicy';

function withoutId(value: object): object {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id'));
}

async function responseError(response: Response, fallbackMessage: string): Promise<Error> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return new Error(data.error);
    }
  } catch {
    // Keep the HTTP status as the actionable fallback for non-JSON API responses.
  }
  return new Error(`${fallbackMessage} (HTTP ${response.status})`);
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw await responseError(response, `Request failed for ${url}`);
  return response.json() as Promise<T>;
}

export const api = {
  getHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json' };
  },

  // Public & Shared
  async getSettings(): Promise<ClinicSettings> {
    return readJson<ClinicSettings>('/api/settings');
  },

  async getContent(): Promise<ClinicContent> {
    return readJson<ClinicContent>('/api/content');
  },

  async getCategories(): Promise<ServiceCategory[]> {
    return readJson<ServiceCategory[]>('/api/categories');
  },

  async getServices(all = false): Promise<TreatmentService[]> {
    const url = all ? '/api/services?all=true' : '/api/services';
    return readJson<TreatmentService[]>(url, { headers: this.getHeaders(), credentials: 'same-origin' });
  },

  async getGallery(all = false): Promise<GalleryItem[]> {
    const url = all ? '/api/gallery?all=true' : '/api/gallery';
    return readJson<GalleryItem[]>(url, { headers: this.getHeaders(), credentials: 'same-origin' });
  },

  async getFaqs(all = false): Promise<FAQItem[]> {
    const url = all ? '/api/faqs?all=true' : '/api/faqs';
    return readJson<FAQItem[]>(url, { headers: this.getHeaders(), credentials: 'same-origin' });
  },

  async submitEnquiry(enquiry: {
    patientName: string;
    phoneNumber: string;
    serviceRequested: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    message?: string;
    isHomeVisitRequested: boolean;
    website?: string;
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
  async login(password: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async logout(): Promise<void> {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'same-origin',
    });
    if (!res.ok) throw new Error('Failed to log out. Please try again.');
  },

  async checkAuth(): Promise<boolean> {
    const res = await fetch('/api/auth/me', {
      headers: this.getHeaders(),
      credentials: 'same-origin',
    });
    if (!res.ok) throw await responseError(res, 'Unable to verify administrator session');
    const data = await res.json();
    if (!data || typeof data.authenticated !== 'boolean') {
      throw new Error('The authentication service returned an invalid response.');
    }
    return data.authenticated;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const passwordError = getAdminPasswordPolicyError(newPassword);
    if (passwordError) throw new Error(passwordError);
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
  },

  // Admin Stats
  async getStats(): Promise<AdminStats> {
    const res = await fetch('/api/stats', { headers: this.getHeaders(), credentials: 'same-origin' });
    if (!res.ok) throw await responseError(res, 'Failed to fetch admin statistics');
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
      body: JSON.stringify(withoutId(service)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create service');
    return data;
  },

  async updateService(id: string, updates: Partial<TreatmentService>): Promise<TreatmentService> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(withoutId(updates)),
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
      body: JSON.stringify(withoutId(category)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create category');
    return data;
  },

  async updateCategory(id: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(withoutId(updates)),
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
      body: JSON.stringify(withoutId(item)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add gallery item');
    return data;
  },

  async updateGalleryItem(id: string, updates: Partial<GalleryItem>): Promise<GalleryItem> {
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(withoutId(updates)),
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
      body: JSON.stringify(withoutId(faq)),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create FAQ');
    return data;
  },

  async updateFaq(id: string, updates: Partial<FAQItem>): Promise<FAQItem> {
    const res = await fetch(`/api/faqs/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(withoutId(updates)),
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
    const res = await fetch('/api/enquiries', { headers: this.getHeaders(), credentials: 'same-origin' });
    if (!res.ok) throw await responseError(res, 'Failed to fetch enquiries');
    return res.json();
  },

  async getEnquiriesPage(status = 'all', cursor?: EnquiryCursor): Promise<EnquiryPage> {
    const params = new URLSearchParams({ limit: '50', status });
    if (cursor) {
      params.set('cursorCreatedAt', cursor.createdAt);
      params.set('cursorId', cursor.id);
    }
    return readJson<EnquiryPage>(`/api/enquiries?${params}`, {
      headers: this.getHeaders(),
      credentials: 'same-origin',
    });
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
