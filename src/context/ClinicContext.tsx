import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClinicSettings, ClinicContent, ServiceCategory, TreatmentService, GalleryItem, FAQItem } from '../types';
import { api } from '../api';

interface ClinicContextType {
  settings: ClinicSettings | null;
  content: ClinicContent | null;
  categories: ServiceCategory[];
  services: TreatmentService[];
  gallery: GalleryItem[];
  faqs: FAQItem[];
  isLoading: boolean;
  error: string | null;
  language: 'en' | 'hi';
  setLanguage: (lang: 'en' | 'hi') => void;
  activeView: string;
  setActiveView: (view: string) => void;
  isAppointmentModalOpen: boolean;
  setIsAppointmentModalOpen: (open: boolean) => void;
  prefilledServiceName: string;
  openAppointmentModal: (serviceName?: string) => void;
  selectedService: TreatmentService | null;
  setSelectedService: (service: TreatmentService | null) => void;
  getWhatsappUrl: (message?: string) => string;
  refreshData: () => Promise<void>;
}

export interface ClinicBootstrapData {
  settings: ClinicSettings;
  content: ClinicContent;
  categories: ServiceCategory[];
  services: TreatmentService[];
  gallery: GalleryItem[];
  faqs: FAQItem[];
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const VIEW_PATHS: Record<string, string> = {
  home: '/',
  services: '/treatments',
  about: '/about',
  gallery: '/gallery',
  contact: '/contact',
  faqs: '/faqs',
  privacy: '/privacy-policy',
  admin: '/admin',
};

function getViewFromLocation() {
  const hash = window.location.hash.replace('#', '').trim();
  if (Object.prototype.hasOwnProperty.call(VIEW_PATHS, hash)) return hash;

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  return Object.entries(VIEW_PATHS).find(([, path]) => path === pathname)?.[0] || 'home';
}

export function ClinicProvider({
  children,
  initialData,
  initialView,
}: {
  children: ReactNode;
  initialData?: ClinicBootstrapData;
  initialView?: string;
}) {
  const [settings, setSettings] = useState<ClinicSettings | null>(initialData?.settings ?? null);
  const [content, setContent] = useState<ClinicContent | null>(initialData?.content ?? null);
  const [categories, setCategories] = useState<ServiceCategory[]>(initialData?.categories ?? []);
  const [services, setServices] = useState<TreatmentService[]>(initialData?.services ?? []);
  const [gallery, setGallery] = useState<GalleryItem[]>(initialData?.gallery ?? []);
  const [faqs, setFaqs] = useState<FAQItem[]>(initialData?.faqs ?? []);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeView, setActiveView] = useState<string>(() => initialView || getViewFromLocation());
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [prefilledServiceName, setPrefilledServiceName] = useState('');
  const [selectedService, setSelectedService] = useState<TreatmentService | null>(null);

  useEffect(() => {
    const handleLocationChange = () => setActiveView(getViewFromLocation());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange();
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const loadData = async () => {
    try {
      if (!settings || !content) setIsLoading(true);
      setError(null);
      const [sData, cData, catData, srvData, gData, fData] = await Promise.all([
        api.getSettings(),
        api.getContent(),
        api.getCategories(),
        api.getServices(),
        api.getGallery(),
        api.getFaqs(),
      ]);

      setSettings(sData);
      setContent(cData);
      setCategories(catData);
      setServices(srvData);
      setGallery(gData);
      setFaqs(fData);
    } catch (err: any) {
      console.error('Failed to load clinic data:', err);
      setError(err.message || 'Unable to load clinic information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAppointmentModal = (serviceName?: string) => {
    setPrefilledServiceName(serviceName || '');
    setIsAppointmentModalOpen(true);
  };

  const getWhatsappUrl = (customMessage?: string) => {
    const phone = settings?.whatsappNumber || '918864849409';
    const message = customMessage || 'Namaste! Maine aapki website dekhi h aur mujhe physiotherapy ke liye appointment book karni hai.';
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const navigateTo = (view: string) => {
    const path = VIEW_PATHS[view];
    if (!path) {
      throw new Error(`Unknown clinic page: ${view}`);
    }

    setActiveView(view);
    window.history.pushState(null, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ClinicContext.Provider
      value={{
        settings,
        content,
        categories,
        services,
        gallery,
        faqs,
        isLoading,
        error,
        language,
        setLanguage,
        activeView,
        setActiveView: navigateTo,
        isAppointmentModalOpen,
        setIsAppointmentModalOpen,
        prefilledServiceName,
        openAppointmentModal,
        selectedService,
        setSelectedService,
        getWhatsappUrl,
        refreshData: loadData,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
}
