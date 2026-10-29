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
  getWhatsappUrl: () => string;
  refreshData: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [content, setContent] = useState<ClinicContent | null>(null);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<TreatmentService[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [activeView, setActiveView] = useState<string>('home');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [prefilledServiceName, setPrefilledServiceName] = useState('');
  const [selectedService, setSelectedService] = useState<TreatmentService | null>(null);

  // Sync hash or URL
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (['home', 'about', 'services', 'gallery', 'contact', 'faqs', 'privacy', 'admin'].includes(hash)) {
        setActiveView(hash);
      } else if (window.location.pathname === '/admin') {
        setActiveView('admin');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
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

  const getWhatsappUrl = () => {
    const phone = settings?.whatsappNumber || '918864849409';
    const message = 'Namaste! Maine aapki website dekhi h aur mujhe physiotherapy ke liye appointment book karni hai.';
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const navigateTo = (view: string) => {
    setActiveView(view);
    window.location.hash = view;
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
