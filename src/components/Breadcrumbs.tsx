import React from 'react';
import { useClinic, VIEW_PATHS } from '../context/ClinicContext';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

interface BreadcrumbProps {
  customTitle?: string;
  parentView?: { id: string; label: string };
}

export function Breadcrumbs({ customTitle, parentView }: BreadcrumbProps) {
  const { activeView, setActiveView, language } = useClinic();

  if (activeView === 'home') return null;

  const viewLabels: Record<string, { en: string; hi: string }> = {
    services: { en: 'Treatments & Rehabilitation', hi: 'उपचार एवं सेवाएं' },
    about: { en: 'About Dr. Harshit Jain & Clinic', hi: 'डॉ. हर्षित जैन एवं क्लिनिक परिचय' },
    gallery: { en: 'Clinic Photo Gallery', hi: 'क्लिनिक फोटो गैलरी' },
    contact: { en: 'Contact Us & Location', hi: 'संपर्क एवं पता' },
    faqs: { en: 'Frequently Asked Questions', hi: 'प्रश्नोत्तरी (FAQs)' },
    privacy: { en: 'Privacy Policy', hi: 'गोपनीयता नीति' },
    admin: { en: 'Clinic Admin Portal', hi: 'एडमिनिस्ट्रेटर पोर्टल' },
  };

  const currentInfo = viewLabels[activeView] || { en: activeView, hi: activeView };
  const currentTitle = customTitle || (language === 'hi' ? currentInfo.hi : currentInfo.en);
  const homeLabel = language === 'hi' ? 'मुख्य पृष्ठ' : 'Home';
  const backLabel = language === 'hi' ? 'पीछे जाएं' : 'Back';

  return (
    <div className="bg-slate-100/60 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Breadcrumb path */}
          <nav aria-label="Breadcrumb" className="overflow-x-auto no-scrollbar">
            <ol className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 font-medium whitespace-nowrap">
              {/* Home Link */}
              <li className="flex items-center">
                <a
                  href={VIEW_PATHS.home}
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveView('home');
                  }}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-900 transition-colors cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-blue-900" />
                  <span className="hover:underline">{homeLabel}</span>
                </a>
              </li>

              <li aria-hidden="true" className="text-slate-400">
                <ChevronRight className="w-3.5 h-3.5" />
              </li>

              {/* Optional Parent Link */}
              {parentView && (
                <>
                  <li className="flex items-center">
                    <a
                      href={VIEW_PATHS[parentView.id] || '/'}
                      onClick={(event) => {
                        event.preventDefault();
                        setActiveView(parentView.id);
                      }}
                      className="text-slate-600 hover:text-blue-900 hover:underline transition-colors cursor-pointer"
                    >
                      {parentView.label}
                    </a>
                  </li>
                  <li aria-hidden="true" className="text-slate-400">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </li>
                </>
              )}

              {/* Current Page Item */}
              <li className="flex items-center font-bold text-slate-900 truncate max-w-[200px] sm:max-w-none" aria-current="page">
                <span>{currentTitle}</span>
              </li>
            </ol>
          </nav>

          {/* Quick 1-tap back to previous or Home button (Mobile & Desktop convenience) */}
          <button
            onClick={() => {
              if (parentView) {
                setActiveView(parentView.id);
              } else {
                setActiveView('home');
              }
            }}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
