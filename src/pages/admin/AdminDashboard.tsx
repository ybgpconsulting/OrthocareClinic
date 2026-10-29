import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { api } from '../../api';
import {
  AdminStats,
  PatientEnquiry,
  TreatmentService,
  ServiceCategory,
  GalleryItem,
  FAQItem,
  ClinicSettings,
  ClinicContent,
  EnquiryCursor,
} from '../../types';
import {
  Lock,
  LogOut,
  Users,
  Activity,
  FolderTree,
  Image as ImageIcon,
  FileEdit,
  Settings as SettingsIcon,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  AlertCircle,
  Phone,
  Eye,
  EyeOff,
  Upload,
  Calendar,
  Save,
  Clock,
  Home,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { WhatsAppIcon } from '../../components/WhatsAppIcon';
import { ResponsiveImage } from '../../components/ResponsiveImage';
import { getAdminPasswordPolicyError } from '../../authPolicy';
import {
  formatLegacySundayHours,
  formatLegacyWeekdayHours,
  getWeeklyHours,
  WEEKDAYS,
  validateWeeklyHours,
} from '../../utils/openingHours';

export function AdminDashboard() {
  const { setActiveView, refreshData } = useClinic();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authCheckError, setAuthCheckError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<
    'overview' | 'enquiries' | 'services' | 'categories' | 'gallery' | 'content' | 'settings' | 'faqs'
  >('overview');

  // Admin Data state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [enquiries, setEnquiries] = useState<PatientEnquiry[]>([]);
  const [enquiriesCursor, setEnquiriesCursor] = useState<EnquiryCursor | null>(null);
  const [isLoadingEnquiriesPage, setIsLoadingEnquiriesPage] = useState(false);
  const [services, setServices] = useState<TreatmentService[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [settingsForm, setSettingsForm] = useState<ClinicSettings | null>(null);
  const [contentForm, setContentForm] = useState<ClinicContent | null>(null);

  // Loading & notification states
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [adminDataError, setAdminDataError] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals & form editing states
  const [editingService, setEditingService] = useState<TreatmentService | null>(null);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [isCreatingGallery, setIsCreatingGallery] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [isCreatingFaq, setIsCreatingFaq] = useState(false);

  // Password change state
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Status filter for enquiries
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState<string>('all');

  // Check auth status on mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    setAuthCheckError(null);
    setIsAuthenticated(null);
    try {
      const isAuthed = await api.checkAuth();
      setIsAuthenticated(isAuthed);
      if (isAuthed) {
        await loadAllAdminData();
      }
    } catch (err: unknown) {
      setAuthCheckError(err instanceof Error ? err.message : 'Unable to verify administrator session.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);
    try {
      await api.login(passwordInput);
      setIsAuthenticated(true);
      setPasswordInput('');
      if (await loadAllAdminData()) {
        showFeedback('success', 'Logged in successfully as Administrator');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Invalid admin password. Use the password configured for this clinic.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setIsAuthenticated(false);
      setActiveView('home');
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to log out. Please try again.');
    }
  };

  const loadAllAdminData = async (): Promise<boolean> => {
    try {
      setIsLoadingTab(true);
      setAdminDataError(null);
      const [sStats, sEnqs, sSrvs, sCats, sGal, sFaqs, sSet, sCont] = await Promise.all([
        api.getStats(),
        api.getEnquiriesPage(enquiryStatusFilter),
        api.getServices(true),
        api.getCategories(),
        api.getGallery(true),
        api.getFaqs(true),
        api.getSettings(),
        api.getContent(),
      ]);

      setStats(sStats);
      setEnquiries(sEnqs.items);
      setEnquiriesCursor(sEnqs.nextCursor);
      setServices(sSrvs);
      setCategories(sCats);
      setGallery(sGal);
      setFaqs(sFaqs);
      setSettingsForm(sSet);
      setContentForm(sCont);
      return true;
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setAdminDataError(err.message || 'Administrative records could not be loaded from the API.');
      return false;
    } finally {
      setIsLoadingTab(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  const changeEnquiryFilter = async (status: string) => {
    setEnquiryStatusFilter(status);
    setIsLoadingEnquiriesPage(true);
    try {
      const page = await api.getEnquiriesPage(status);
      setEnquiries(page.items);
      setEnquiriesCursor(page.nextCursor);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to load enquiries.');
    } finally {
      setIsLoadingEnquiriesPage(false);
    }
  };

  const loadMoreEnquiries = async () => {
    if (!enquiriesCursor || isLoadingEnquiriesPage) return;
    setIsLoadingEnquiriesPage(true);
    try {
      const page = await api.getEnquiriesPage(enquiryStatusFilter, enquiriesCursor);
      setEnquiries((current) => [...current, ...page.items]);
      setEnquiriesCursor(page.nextCursor);
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to load more enquiries.');
    } finally {
      setIsLoadingEnquiriesPage(false);
    }
  };

  const updateDayHours = (
    dayId: (typeof WEEKDAYS)[number]['id'],
    update: (day: ReturnType<typeof getWeeklyHours>[number]) => ReturnType<typeof getWeeklyHours>[number]
  ) => {
    setSettingsForm((current) => {
      if (!current) return current;
      const weeklyHours = getWeeklyHours(current).map((day) => (day.day === dayId ? update(day) : day));
      return { ...current, weeklyHours };
    });
  };

  // ================= ENQUIRIES HANDLERS =================
  const handleUpdateEnquiryStatus = async (id: string, status: PatientEnquiry['status'], notes?: string) => {
    try {
      await api.updateEnquiryStatus(id, status, notes);
      setEnquiries((prev) =>
        prev.flatMap((enquiry) => {
          if (enquiry.id !== id) return [enquiry];
          if (enquiryStatusFilter !== 'all' && status !== enquiryStatusFilter) return [];
          return [{ ...enquiry, status, internalNotes: notes ?? enquiry.internalNotes }];
        })
      );
      showFeedback('success', `Enquiry status updated to ${status}`);
      // Refresh stats
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update enquiry');
    }
  };

  const handleDeleteEnquiry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this enquiry? This action cannot be undone.')) return;
    try {
      await api.deleteEnquiry(id);
      setEnquiries((prev) => prev.filter((e) => e.id !== id));
      showFeedback('success', 'Enquiry deleted');
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete enquiry');
    }
  };

  // ================= SERVICES HANDLERS =================
  const handleSaveService = async (service: TreatmentService) => {
    try {
      if (isCreatingService) {
        const created = await api.createService(service);
        setServices((prev) => [...prev, created]);
        showFeedback('success', 'New service added successfully');
      } else {
        const updated = await api.updateService(service.id, service);
        setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        showFeedback('success', 'Service updated successfully');
      }
      setIsCreatingService(false);
      setEditingService(null);
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save service');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.deleteService(id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      showFeedback('success', 'Service deleted');
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete service');
    }
  };

  const handleToggleServiceVisibility = async (service: TreatmentService) => {
    try {
      const updated = await api.updateService(service.id, { isVisible: !service.isVisible });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showFeedback('success', `Service visibility set to ${!service.isVisible ? 'Visible' : 'Hidden'}`);
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to toggle visibility');
    }
  };

  // ================= CATEGORIES HANDLERS =================
  const handleSaveCategory = async (cat: ServiceCategory) => {
    try {
      if (isCreatingCategory) {
        const created = await api.createCategory(cat);
        setCategories((prev) => [...prev, created]);
        showFeedback('success', 'New category added');
      } else {
        const updated = await api.updateCategory(cat.id, cat);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showFeedback('success', 'Category updated');
      }
      setIsCreatingCategory(false);
      setEditingCategory(null);
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const fallbackId = categories.find((c) => c.id !== id)?.id;
    if (!window.confirm('Delete this category? Any assigned services will be safely preserved under another category.')) return;
    try {
      await api.deleteCategory(id, fallbackId);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      // Reload services to reflect safe reassignment
      const refreshedServices = await api.getServices(true);
      setServices(refreshedServices);
      showFeedback('success', 'Category removed safely');
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete category');
    }
  };

  // ================= GALLERY HANDLERS =================
  const handleSaveGalleryItem = async (item: GalleryItem) => {
    try {
      if (isCreatingGallery) {
        const created = await api.createGalleryItem(item);
        setGallery((prev) => [...prev, created]);
        showFeedback('success', 'Photo added to gallery');
      } else {
        const updated = await api.updateGalleryItem(item.id, item);
        setGallery((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
        showFeedback('success', 'Gallery item updated');
      }
      setIsCreatingGallery(false);
      setEditingGallery(null);
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to save gallery item');
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    if (!window.confirm('Delete this photo from gallery?')) return;
    try {
      await api.deleteGalleryItem(id);
      setGallery((prev) => prev.filter((g) => g.id !== id));
      showFeedback('success', 'Gallery item deleted');
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to delete gallery item');
    }
  };

  // ================= SETTINGS & CONTENT SAVE =================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    const weeklyHours = getWeeklyHours(settingsForm);
    const hoursError = validateWeeklyHours(weeklyHours);
    if (hoursError) {
      showFeedback('error', hoursError);
      return;
    }
    try {
      const updated = await api.updateSettings({
        ...settingsForm,
        weeklyHours,
        openingHoursWeekday: formatLegacyWeekdayHours(weeklyHours),
        openingHoursSunday: formatLegacySundayHours(weeklyHours),
      });
      setSettingsForm(updated);
      showFeedback('success', 'Clinic contact and hours settings saved! Website updated.');
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update settings');
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentForm) return;
    try {
      const updated = await api.updateContent(contentForm);
      setContentForm(updated);
      showFeedback('success', 'Website content and headlines saved! Website updated.');
      refreshData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update content');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      showFeedback('error', 'New password and confirmation do not match');
      return;
    }
    const passwordError = getAdminPasswordPolicyError(newPass);
    if (passwordError) {
      showFeedback('error', passwordError);
      return;
    }

    try {
      await api.changePassword(currPass, newPass);
      setCurrPass('');
      setNewPass('');
      setConfirmPass('');
      setAuthError('Password changed successfully. Sign in again with your new password.');
      setIsAuthenticated(false);
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to change password');
    }
  };

  // Filtered enquiries
  const filteredEnquiries = enquiries.filter((e) =>
    enquiryStatusFilter === 'all' ? true : e.status === enquiryStatusFilter
  );

  // ================= LOGIN SCREEN =================
  if (isAuthenticated === false) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="bg-slate-900 p-8 text-center text-white">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 text-white">
              <Lock className="w-6 h-6 text-red-400" />
            </div>
            <h1 className="text-xl font-bold">Orthocare Clinic Portal</h1>
            <p className="text-xs text-slate-300 mt-1">
              Authorized Owner & Staff Management Panel
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {authError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                maxLength={128}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Use the admin password configured for this clinic.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {isLoggingIn ? 'Verifying Password...' : 'Sign In to Admin Panel'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Return to Clinic Public Website
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (authCheckError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-red-200 p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h1 className="text-lg font-bold">Unable to verify administrator session</h1>
          </div>
          <p role="alert" className="text-sm text-slate-600">{authCheckError}</p>
          <p className="text-xs text-slate-500">The API did not confirm your session. No clinic data has been substituted.</p>
          <button
            type="button"
            onClick={() => void checkAuthentication()}
            className="w-full py-3 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Checking administrator session...
      </div>
    );
  }

  if (isLoadingTab) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading current administrative records...
      </div>
    );
  }

  if (adminDataError) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-red-200 p-8 space-y-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h1 className="text-lg font-bold">Unable to load administrative records</h1>
          </div>
          <p role="alert" className="text-sm text-slate-600">{adminDataError}</p>
          <p className="text-xs text-slate-500">The dashboard is unavailable until the API returns the current clinic data.</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void loadAllAdminData()}
              disabled={isLoadingTab}
              className="flex-1 py-3 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
            >
              {isLoadingTab ? 'Retrying…' : 'Retry Loading'}
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= MAIN DASHBOARD UI =================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-800'
              : 'bg-red-900 text-white border-red-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Admin Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Orthocare Clinic Administration
          </h1>
          <p className="text-xs text-slate-500">
            Dr. Harshit Jain (PT) · All changes update the live website immediately
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('home')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live Site</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'enquiries', label: `Patient Enquiries (${stats?.newEnquiries || 0} New)`, icon: Users },
          { id: 'services', label: `Treatments (${services.length})`, icon: Activity },
          { id: 'categories', label: `Categories (${categories.length})`, icon: FolderTree },
          { id: 'gallery', label: `Gallery Photos (${gallery.length})`, icon: ImageIcon },
          { id: 'content', label: 'Website Content', icon: FileEdit },
          { id: 'settings', label: 'Contact & Settings', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Total Enquiries</span>
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {stats?.totalEnquiries || 0}
              </span>
              <span className="text-xs text-red-600 font-medium block">
                {stats?.newEnquiries || 0} requiring action
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Published Services</span>
              <span className="text-3xl font-extrabold text-blue-900 tabular-nums">
                {stats?.visibleServicesCount || 0}
              </span>
              <span className="text-xs text-slate-500 block">Across {stats?.categoriesCount || 0} categories</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Gallery Images</span>
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {stats?.galleryCount || 0}
              </span>
              <span className="text-xs text-slate-500 block">Clinic & Equipment photos</span>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Scheduled Patients</span>
              <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                {stats?.scheduledEnquiries || 0}
              </span>
              <span className="text-xs text-slate-500 block">Active appointments</span>
            </div>
          </div>

          {/* Recent Enquiries Activity */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Patient Inquiries</h2>
                <p className="text-xs text-slate-500">Patients seeking physiotherapy appointments in Baghpat</p>
              </div>
              <button
                onClick={() => setActiveTab('enquiries')}
                className="text-xs font-semibold text-blue-900 hover:underline"
              >
                View All Enquiries &rarr;
              </button>
            </div>

            {!stats?.recentEnquiries.length ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No patient enquiries yet. Submitted forms will appear here in real-time.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentEnquiries.map((enq) => (
                  <div key={enq.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{enq.patientName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            enq.status === 'new'
                              ? 'bg-red-100 text-red-700'
                              : enq.status === 'contacted'
                              ? 'bg-blue-100 text-blue-700'
                              : enq.status === 'scheduled'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {enq.status}
                        </span>
                        {enq.isHomeVisitRequested && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold">
                            Home Visit
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">
                        Service: <span className="font-semibold text-slate-800">{enq.serviceRequested}</span>
                        {enq.preferredDate && ` · Date: ${enq.preferredDate}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${enq.phoneNumber}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs tabular-nums"
                      >
                        <Phone className="w-3 h-3 text-blue-900" />
                        <span>{enq.phoneNumber}</span>
                      </a>
                      <a
                        href={`https://wa.me/91${enq.phoneNumber}?text=${encodeURIComponent('Namaste! Main Orthocare Clinic se aapki appointment request ke sambandh mein sampark kar raha hoon.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                      >
                        <WhatsAppIcon className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: ENQUIRIES ================= */}
      {activeTab === 'enquiries' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Patient Appointment Inquiries</h2>
              <p className="text-xs text-slate-500">
                Manage inbound appointment requests, change patient status, and record internal clinical notes.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              {['all', 'new', 'contacted', 'scheduled', 'completed', 'closed'].map((status) => (
                <button
                  key={status}
                  disabled={isLoadingEnquiriesPage}
                  onClick={() => void changeEnquiryFilter(status)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                    enquiryStatusFilter === status ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredEnquiries.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
              No inquiries found in this status category.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredEnquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{enq.patientName}</h3>
                        {enq.isHomeVisitRequested && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Home Visit Requested
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Received: {new Date(enq.createdAt).toLocaleDateString()} at{' '}
                          {new Date(enq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700">
                        Requested Service:{' '}
                        <span className="font-semibold text-blue-900">{enq.serviceRequested}</span>
                      </p>

                      {(enq.preferredDate || enq.preferredTimeSlot) && (
                        <p className="text-xs text-slate-600">
                          Preferred Slot:{' '}
                          <span className="font-medium text-slate-800">
                            {enq.preferredDate || 'Any Date'} ({enq.preferredTimeSlot || 'Any Time'})
                          </span>
                        </p>
                      )}

                      {enq.message && (
                        <p className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700 italic">
                          "{enq.message}"
                        </p>
                      )}
                    </div>

                    {/* Quick Call & WhatsApp Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${enq.phoneNumber}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 tabular-nums"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call {enq.phoneNumber}</span>
                      </a>

                      <a
                        href={`https://wa.me/91${enq.phoneNumber}?text=${encodeURIComponent('Namaste! Orthocare Clinic se aapki appointment request ke sambandh mein sampark kar rahe hain.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => handleDeleteEnquiry(enq.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete enquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status & Notes Controls */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">Status:</span>
                      <select
                        value={enq.status}
                        onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold text-xs bg-white focus:ring-1 focus:ring-blue-600"
                      >
                        <option value="new">New (Needs Contact)</option>
                        <option value="contacted">Contacted</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="flex-1 max-w-md flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={enq.internalNotes || ''}
                        placeholder="Internal doctor notes (e.g. Call at 5pm, confirmed for Tues)..."
                        onBlur={(e) => {
                          if (e.target.value !== (enq.internalNotes || '')) {
                            handleUpdateEnquiryStatus(enq.id, enq.status, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {enquiriesCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                disabled={isLoadingEnquiriesPage}
                onClick={() => void loadMoreEnquiries()}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoadingEnquiriesPage ? 'Loading…' : 'Load older enquiries'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: SERVICES ================= */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Treatment & Rehabilitation Services</h2>
              <p className="text-xs text-slate-500">
                All 18 treatments with descriptions, duration, pricing notes, and home-visit status.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingService({
                  id: '',
                  categoryId: categories[0]?.id || 'cat-back-neck',
                  name: '',
                  nameHi: '',
                  description: '',
                  descriptionHi: '',
                  roleOfPhysio: '',
                  roleOfPhysioHi: '',
                  commonSymptoms: [],
                  durationMinutes: 40,
                  priceNote: '',
                  homeVisitEligible: true,
                  isVisible: true,
                  order: services.length + 1,
                  image: '',
                });
                setIsCreatingService(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Treatment</span>
            </button>
          </div>

          {/* Service Edit / Create Modal */}
          {(editingService || isCreatingService) && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 border border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isCreatingService ? 'Add New Treatment' : 'Edit Treatment Service'}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingService(null);
                      setIsCreatingService(false);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Service Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingService?.name || ''}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Service Name (Hindi)
                    </label>
                    <input
                      type="text"
                      value={editingService?.nameHi || ''}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, nameHi: e.target.value }))}
                      placeholder="उदा: कमर दर्द फिजियोथेरेपी"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={editingService?.categoryId || ''}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Duration (Mins)
                    </label>
                    <input
                      type="number"
                      value={editingService?.durationMinutes || 40}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={editingService?.order || 1}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, order: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Problem Description (English) *
                  </label>
                  <textarea
                    rows={2}
                    value={editingService?.description || ''}
                    onChange={(e) => setEditingService((prev: any) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Problem Description (Hindi)
                  </label>
                  <textarea
                    rows={2}
                    value={editingService?.descriptionHi || ''}
                    onChange={(e) => setEditingService((prev: any) => ({ ...prev, descriptionHi: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Role of Physiotherapy (English)
                  </label>
                  <textarea
                    rows={2}
                    value={editingService?.roleOfPhysio || ''}
                    onChange={(e) => setEditingService((prev: any) => ({ ...prev, roleOfPhysio: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Role of Physiotherapy (Hindi)
                  </label>
                  <textarea
                    rows={2}
                    value={editingService?.roleOfPhysioHi || ''}
                    onChange={(e) => setEditingService((prev: any) => ({ ...prev, roleOfPhysioHi: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Pricing Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingService?.priceNote || ''}
                    onChange={(e) => setEditingService((prev: any) => ({ ...prev, priceNote: e.target.value }))}
                    placeholder="e.g. Consult clinic for charges"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                  />
                </div>

                {/* Home visit & visibility */}
                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingService?.homeVisitEligible || false}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, homeVisitEligible: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Home Visit Eligible</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editingService?.isVisible !== false}
                      onChange={(e) => setEditingService((prev: any) => ({ ...prev, isVisible: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>Visible on Website</span>
                  </label>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingService(null);
                      setIsCreatingService(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => editingService && handleSaveService(editingService)}
                    className="px-5 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800"
                  >
                    Save Service
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Services List Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Order</th>
                  <th className="p-3.5">Service Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5">Home Visit</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold tabular-nums text-slate-400">{srv.order}</td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-900 block">{srv.name}</span>
                      {srv.nameHi && <span className="text-[11px] text-slate-500">{srv.nameHi}</span>}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {categories.find((c) => c.id === srv.categoryId)?.name || 'General'}
                    </td>
                    <td className="p-3.5 tabular-nums">{srv.durationMinutes} min</td>
                    <td className="p-3.5">
                      {srv.homeVisitEligible ? (
                        <span className="text-emerald-700 font-semibold">Yes</span>
                      ) : (
                        <span className="text-slate-400">Clinic only</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleServiceVisibility(srv)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          srv.isVisible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {srv.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{srv.isVisible ? 'Visible' : 'Hidden'}</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingService(srv);
                          setIsCreatingService(false);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-slate-100"
                        title="Edit service"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: CATEGORIES ================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Treatment Categories</h2>
              <p className="text-xs text-slate-500">
                Organize treatments into patient-friendly categories. Deleting a category automatically protects services by reassigning them.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCategory({
                  id: '',
                  name: '',
                  nameHi: '',
                  order: categories.length + 1,
                  description: '',
                });
                setIsCreatingCategory(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          {/* Edit / Create Category Modal */}
          {(editingCategory || isCreatingCategory) && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border">
                <h3 className="text-base font-bold text-slate-900">
                  {isCreatingCategory ? 'Create New Category' : 'Edit Category'}
                </h3>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Category Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCategory?.name || ''}
                    onChange={(e) => setEditingCategory((prev: any) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Category Name (Hindi)
                  </label>
                  <input
                    type="text"
                    value={editingCategory?.nameHi || ''}
                    onChange={(e) => setEditingCategory((prev: any) => ({ ...prev, nameHi: e.target.value }))}
                    placeholder="उदा: कमर एवं गर्दन दर्द"
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={editingCategory?.order || 1}
                    onChange={(e) => setEditingCategory((prev: any) => ({ ...prev, order: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCreatingCategory(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editingCategory && handleSaveCategory(editingCategory)}
                    className="px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold"
                  >
                    Save Category
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Order</th>
                  <th className="p-3.5">Category Name</th>
                  <th className="p-3.5">Hindi Name</th>
                  <th className="p-3.5">Assigned Services</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => {
                  const assignedCount = services.filter((s) => s.categoryId === cat.id).length;
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-bold tabular-nums text-slate-400">{cat.order}</td>
                      <td className="p-3.5 font-bold text-slate-900">{cat.name}</td>
                      <td className="p-3.5 text-slate-600">{cat.nameHi || '—'}</td>
                      <td className="p-3.5 tabular-nums text-blue-900 font-semibold">{assignedCount} treatments</td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setIsCreatingCategory(false);
                          }}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-blue-900 hover:bg-slate-100"
                          title="Edit category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 5: GALLERY ================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clinic Image Gallery</h2>
              <p className="text-xs text-slate-500">
                Use static image paths from the public images folder. File uploads are temporarily unavailable.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled
                title="Image uploads are temporarily unavailable"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 text-slate-500 text-xs font-semibold shadow-xs cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                <span>Uploads unavailable</span>
              </button>

              <button
                onClick={() => {
                  setEditingGallery({
                    id: '',
                    title: '',
                    category: 'rehabilitation',
                    url: '',
                    alt: '',
                    caption: '',
                    order: gallery.length + 1,
                    isVisible: true,
                  });
                  setIsCreatingGallery(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Photo URL</span>
              </button>
            </div>
          </div>

          {/* Edit / Add Gallery item modal */}
          {(editingGallery || isCreatingGallery) && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border">
                <h3 className="text-base font-bold text-slate-900">
                  {isCreatingGallery ? 'Add Gallery Photo' : 'Edit Photo Details'}
                </h3>

                {editingGallery?.url && (
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-100">
                    <ResponsiveImage
                      src={editingGallery.url}
                      alt="Preview"
                      sizes="(min-width: 640px) 32rem, 100vw"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Static Photo URL or Path *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGallery?.url || ''}
                    onChange={(e) => setEditingGallery((prev: any) => ({ ...prev, url: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                    placeholder="/images/clinic_treatment_room_1793268957681.jpg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Photo Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingGallery?.title || ''}
                    onChange={(e) => setEditingGallery((prev: any) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={editingGallery?.category || 'rehabilitation'}
                      onChange={(e) => setEditingGallery((prev: any) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                    >
                      <option value="rehabilitation">Treatment & Rehab Room</option>
                      <option value="consultation">Consultation Room</option>
                      <option value="equipment">Electrotherapy Equipment</option>
                      <option value="clinic_exterior">Clinic Exterior / Board</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={editingGallery?.order || 1}
                      onChange={(e) => setEditingGallery((prev: any) => ({ ...prev, order: Number(e.target.value) }))}
                      className="w-full px-3 py-2 text-sm border rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Caption / Description
                  </label>
                  <textarea
                    rows={2}
                    value={editingGallery?.caption || ''}
                    onChange={(e) => setEditingGallery((prev: any) => ({ ...prev, caption: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border rounded-xl"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t">
                  <button
                    onClick={() => {
                      setEditingGallery(null);
                      setIsCreatingGallery(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editingGallery && handleSaveGalleryItem(editingGallery)}
                    className="px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold"
                  >
                    Save Photo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Gallery Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {gallery.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between">
                <div>
                  <div className="aspect-4/3 bg-slate-100 relative">
                    <ResponsiveImage
                      src={g.url}
                      alt={g.alt || g.title}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900/80 text-white uppercase tracking-wider">
                      {g.category.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="p-3.5 space-y-1">
                    <p className="font-bold text-slate-900 text-xs line-clamp-1">{g.title}</p>
                    {g.caption && <p className="text-[11px] text-slate-500 line-clamp-2">{g.caption}</p>}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-xs">
                  <span className="text-slate-400 tabular-nums">#{g.order}</span>
                  <div className="space-x-1">
                    <button
                      onClick={() => {
                        setEditingGallery(g);
                        setIsCreatingGallery(false);
                      }}
                      className="p-1 text-slate-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGalleryItem(g.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 6: WEBSITE CONTENT ================= */}
      {activeTab === 'content' && contentForm && (
        <form onSubmit={handleSaveContent} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Website Content & Headlines</h2>
            <p className="text-xs text-slate-500">
              Customize hero headlines, doctor bio, announcement banner, and privacy policy directly without touching code.
            </p>
          </div>

          {/* Announcement Bar */}
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-blue-950">Top Announcement Banner</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-900">
                <input
                  type="checkbox"
                  checked={contentForm.announcementActive}
                  onChange={(e) => setContentForm({ ...contentForm, announcementActive: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Show on Website</span>
              </label>
            </div>
            <input
              type="text"
              value={contentForm.announcementText}
              onChange={(e) => setContentForm({ ...contentForm, announcementText: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-blue-200 rounded-xl bg-white"
            />
          </div>

          {/* Hero Headlines */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Hero Section</h3>
            
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Small Tagline
              </label>
              <input
                type="text"
                value={contentForm.heroTagline}
                onChange={(e) => setContentForm({ ...contentForm, heroTagline: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Main Headline (English)
                </label>
                <input
                  type="text"
                  value={contentForm.heroHeadline}
                  onChange={(e) => setContentForm({ ...contentForm, heroHeadline: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Main Headline (Hindi)
                </label>
                <input
                  type="text"
                  value={contentForm.heroHeadlineHi}
                  onChange={(e) => setContentForm({ ...contentForm, heroHeadlineHi: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Hero Subtitle (English)
                </label>
                <textarea
                  rows={2}
                  value={contentForm.heroSubtitle}
                  onChange={(e) => setContentForm({ ...contentForm, heroSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Hero Subtitle (Hindi)
                </label>
                <textarea
                  rows={2}
                  value={contentForm.heroSubtitleHi}
                  onChange={(e) => setContentForm({ ...contentForm, heroSubtitleHi: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* About Doctor & Clinic */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">About Clinic & Doctor Profile</h3>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                About Section Title
              </label>
              <input
                type="text"
                value={contentForm.aboutTitle}
                onChange={(e) => setContentForm({ ...contentForm, aboutTitle: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Clinic Overview Narrative (English)
              </label>
              <textarea
                rows={3}
                value={contentForm.aboutText}
                onChange={(e) => setContentForm({ ...contentForm, aboutText: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Doctor Bio & Credentials Narrative
              </label>
              <textarea
                rows={3}
                value={contentForm.aboutDoctorBio}
                onChange={(e) => setContentForm({ ...contentForm, aboutDoctorBio: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Privacy Policy Terms</h3>
            <textarea
              rows={4}
              value={contentForm.privacyPolicy}
              onChange={(e) => setContentForm({ ...contentForm, privacyPolicy: e.target.value })}
              className="w-full px-3.5 py-2 text-sm border rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Content Changes</span>
          </button>
        </form>
      )}

      {/* ================= TAB 7: SETTINGS & PASSWORD ================= */}
      {activeTab === 'settings' && settingsForm && (
        <div className="space-y-8">
          {/* Clinic Contact Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clinic Contact & Location Configuration</h2>
              <p className="text-xs text-slate-500">
                Updating these phone numbers, timings or address immediately synchronizes all Call Now buttons, WhatsApp links, and footers across the website.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Clinic Name *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.clinicName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, clinicName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Doctor Name *
                </label>
                <input
                  type="text"
                  required
                  value={settingsForm.doctorName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, doctorName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Doctor Qualifications *
              </label>
              <input
                type="text"
                required
                value={settingsForm.doctorQualifications}
                onChange={(e) => setSettingsForm({ ...settingsForm, doctorQualifications: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Tap-to-Call Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  WhatsApp Number (with 91 prefix) *
                </label>
                <input
                  type="tel"
                  required
                  value={settingsForm.whatsappNumber}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Full Physical Address *
              </label>
              <input
                type="text"
                required
                value={settingsForm.address}
                onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <section aria-labelledby="consultation-hours-heading" className="space-y-4">
              <div>
                <h3 id="consultation-hours-heading" className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Consultation Hours by Day
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Set separate opening times for every day. Add another time period for split shifts, or mark a day closed.
                </p>
              </div>

              <div className="space-y-3">
                {getWeeklyHours(settingsForm).map((day) => {
                  const label = WEEKDAYS.find(({ id }) => id === day.day)?.label || day.day;
                  const intervals = day.intervals.length > 0 ? day.intervals : [{ open: '', close: '' }];

                  return (
                    <fieldset key={day.day} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <legend className="sr-only">{label} consultation hours</legend>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-24 pt-1">
                          <h4 className="font-semibold text-slate-900">{label}</h4>
                        </div>

                        <div className="flex-1 space-y-3">
                          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={day.isClosed}
                              onChange={(event) =>
                                updateDayHours(day.day, (current) => ({
                                  ...current,
                                  isClosed: event.target.checked,
                                  intervals:
                                    !event.target.checked && current.intervals.length === 0
                                      ? [{ open: '', close: '' }]
                                      : current.intervals,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-blue-900 focus:ring-blue-800"
                            />
                            Closed
                          </label>

                          {!day.isClosed && (
                            <div className="space-y-2">
                              {intervals.map((interval, index) => (
                                <div key={`${day.day}-${index}`} className="flex flex-wrap items-center gap-2">
                                  <label className="sr-only" htmlFor={`hours-${day.day}-${index}-open`}>
                                    {label} time period {index + 1} opens
                                  </label>
                                  <input
                                    id={`hours-${day.day}-${index}-open`}
                                    type="time"
                                    required
                                    value={interval.open}
                                    onChange={(event) =>
                                      updateDayHours(day.day, (current) => ({
                                        ...current,
                                        intervals: (current.intervals.length > 0
                                          ? current.intervals
                                          : [{ open: '', close: '' }]
                                        ).map((range, rangeIndex) =>
                                          rangeIndex === index ? { ...range, open: event.target.value } : range
                                        ),
                                      }))
                                    }
                                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
                                  />
                                  <span className="text-sm text-slate-500">to</span>
                                  <label className="sr-only" htmlFor={`hours-${day.day}-${index}-close`}>
                                    {label} time period {index + 1} closes
                                  </label>
                                  <input
                                    id={`hours-${day.day}-${index}-close`}
                                    type="time"
                                    required
                                    value={interval.close}
                                    onChange={(event) =>
                                      updateDayHours(day.day, (current) => ({
                                        ...current,
                                        intervals: (current.intervals.length > 0
                                          ? current.intervals
                                          : [{ open: '', close: '' }]
                                        ).map((range, rangeIndex) =>
                                          rangeIndex === index ? { ...range, close: event.target.value } : range
                                        ),
                                      }))
                                    }
                                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
                                  />
                                  {day.intervals.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateDayHours(day.day, (current) => ({
                                          ...current,
                                          intervals: current.intervals.filter((_, rangeIndex) => rangeIndex !== index),
                                        }))
                                      }
                                      aria-label={`Remove ${label} time period ${index + 1}`}
                                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                  )}
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() =>
                                  updateDayHours(day.day, (current) => ({
                                    ...current,
                                    intervals: [...current.intervals, { open: '', close: '' }],
                                  }))
                                }
                                className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-700"
                              >
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Add time period
                              </button>
                              <label className="block max-w-md text-xs font-medium text-slate-600">
                                Note (optional)
                                <input
                                  type="text"
                                  value={day.note || ''}
                                  onChange={(event) =>
                                    updateDayHours(day.day, (current) => ({
                                      ...current,
                                      note: event.target.value || undefined,
                                    }))
                                  }
                                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </section>

            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Google Maps Directions URL
              </label>
              <input
                type="text"
                value={settingsForm.googleMapsUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, googleMapsUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase text-slate-700">
                Google Maps Embed URL
              </label>
              <input
                type="url"
                value={settingsForm.googleMapsEmbedUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, googleMapsEmbedUrl: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border rounded-xl"
              />
              <p className="text-xs text-slate-500">
                Use the embed link for the same clinic pin as the directions URL above.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900">
                <input
                  type="checkbox"
                  checked={settingsForm.homeVisitAvailable}
                  onChange={(e) => setSettingsForm({ ...settingsForm, homeVisitAvailable: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>Home Visit Service Active in Baghpat</span>
              </label>
              <textarea
                rows={2}
                value={settingsForm.homeVisitNote}
                onChange={(e) => setSettingsForm({ ...settingsForm, homeVisitNote: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border rounded-lg bg-white"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Contact & Settings</span>
            </button>
          </form>

          {/* Change Admin Password Form */}
          <form onSubmit={handleChangePassword} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Change Admin Password</h2>
              <p className="text-xs text-slate-500">
                Update the master administrator password used to access this dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
