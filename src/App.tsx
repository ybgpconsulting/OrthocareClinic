import React, { useEffect } from 'react';
import { ClinicBootstrapData, ClinicProvider, useClinic } from './context/ClinicContext';
import { getCanonicalUrl, getRobotsContent, PAGE_METADATA } from './seo';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileQuickBar } from './components/MobileQuickBar';
import { AppointmentModal } from './components/AppointmentModal';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { AboutPage } from './pages/AboutPage';
import { GalleryPage } from './pages/GalleryPage';
import { ContactPage } from './pages/ContactPage';
import { FaqPage } from './pages/FaqPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RefreshCw } from 'lucide-react';

function AppContent() {
  const {
    activeView,
    selectedService,
    setSelectedService,
    settings,
    content,
    isLoading,
    error,
    refreshData,
  } = useClinic();

  useEffect(() => {
    const metadata = PAGE_METADATA[activeView] || PAGE_METADATA.home;
    const canonicalUrl = getCanonicalUrl(activeView);
    const robots = getRobotsContent(activeView);

    document.title = metadata.title;

    const updateMeta = (selector: string, value: string, attribute: 'content' | 'href') => {
      const element = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
      element?.setAttribute(attribute, value);
    };

    updateMeta('meta[name="description"]', metadata.description, 'content');
    updateMeta('meta[name="robots"]', robots, 'content');
    updateMeta('meta[property="og:title"]', metadata.title, 'content');
    updateMeta('meta[property="og:description"]', metadata.description, 'content');
    updateMeta('meta[property="og:url"]', canonicalUrl, 'content');
    updateMeta('meta[name="twitter:title"]', metadata.title, 'content');
    updateMeta('meta[name="twitter:description"]', metadata.description, 'content');
    updateMeta('link[rel="canonical"]', canonicalUrl, 'href');
  }, [activeView]);

  if (activeView !== 'admin' && isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-900" />
        <p className="text-sm font-semibold tracking-wide">
          Loading Orthocare Physiotherapy Clinic...
        </p>
      </div>
    );
  }

  if (activeView !== 'admin' && error && (!settings || !content)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Unable to load clinic details</h2>
          <p className="text-xs text-slate-600">{error}</p>
          <button
            onClick={() => refreshData()}
            className="px-5 py-2.5 rounded-xl bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="site-background min-h-screen flex flex-col text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <Header />

      {activeView !== 'admin' && error && settings && content && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 sm:flex-row sm:px-6 sm:text-left lg:px-8"
        >
          <p>Clinic details could not be refreshed. The information shown may be out of date.</p>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="min-h-11 rounded-lg px-4 font-semibold text-amber-950 underline underline-offset-4 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation on all pages except Home */}
      <Breadcrumbs />

      {/* Main Page Body */}
      <main className="flex-1">
        {activeView === 'home' && <HomePage />}
        {activeView === 'services' && <ServicesPage />}
        {activeView === 'about' && <AboutPage />}
        {activeView === 'gallery' && <GalleryPage />}
        {activeView === 'contact' && <ContactPage />}
        {activeView === 'faqs' && <FaqPage />}
        {activeView === 'privacy' && <PrivacyPolicyPage />}
        {activeView === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer (hidden on admin dashboard for clean workspace) */}
      {activeView !== 'admin' && <Footer />}

      {/* Sticky Mobile Quick Contact Bar */}
      {activeView !== 'admin' && <MobileQuickBar />}

      {/* Interactive Global Modals */}
      <AppointmentModal />
      <ServiceDetailModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
      />
    </div>
  );
}

interface AppProps {
  initialData?: ClinicBootstrapData;
  initialView?: string;
}

export default function App({ initialData, initialView }: AppProps = {}) {
  return (
    <ClinicProvider initialData={initialData} initialView={initialView}>
      <AppContent />
    </ClinicProvider>
  );
}
