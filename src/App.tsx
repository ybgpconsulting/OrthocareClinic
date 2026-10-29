import React from 'react';
import { ClinicProvider, useClinic } from './context/ClinicContext';
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
  const { activeView, selectedService, setSelectedService, isLoading, error, refreshData } = useClinic();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-900" />
        <p className="text-sm font-semibold tracking-wide">
          Loading Orthocare Physiotherapy Clinic...
        </p>
      </div>
    );
  }

  if (error) {
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

export default function App() {
  return (
    <ClinicProvider>
      <AppContent />
    </ClinicProvider>
  );
}
