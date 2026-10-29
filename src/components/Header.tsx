import { useEffect, useRef, useState } from 'react';
import { useClinic, VIEW_PATHS } from '../context/ClinicContext';
import { Phone, Calendar, Languages } from 'lucide-react';

export function Header() {
  const { settings, activeView, setActiveView, openAppointmentModal, language, setLanguage } = useClinic();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const previousScrollY = useRef(0);

  const navLinks = [
    { id: 'home', label: language === 'hi' ? 'मुख्य पृष्ठ' : 'Home' },
    { id: 'services', label: language === 'hi' ? 'उपचार एवं सेवाएं' : 'Treatments' },
    { id: 'about', label: language === 'hi' ? 'हमारे बारे में' : 'About Doctor' },
    { id: 'gallery', label: language === 'hi' ? 'क्लिनिक गैलरी' : 'Clinic Tour' },
    { id: 'faqs', label: language === 'hi' ? 'प्रश्नोत्तरी' : 'FAQs' },
    { id: 'contact', label: language === 'hi' ? 'संपर्क एवं पता' : 'Contact & Location' },
  ];

  const handleNavClick = (id: string) => {
    setActiveView(id);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'hi' : 'en');
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = currentScrollY - previousScrollY.current;

      if (currentScrollY <= 80 || scrollDifference < -4) {
        setIsHeaderVisible(true);
      } else if (scrollDifference > 4 && currentScrollY > 160) {
        setIsHeaderVisible(false);
      }

      previousScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      onFocusCapture={() => setIsHeaderVisible(true)}
      className={`sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none ${
        isHeaderVisible ? 'translate-y-0' : 'max-xl:-translate-y-full xl:translate-y-0'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 max-[360px]:px-3 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 max-[360px]:gap-1 sm:h-20 sm:gap-4 lg:gap-8">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              handleNavClick('home');
            }}
            className="flex shrink-0 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-800"
            aria-label="Orthocare Physiotherapy Clinic home"
          >
            <img
              src="/logos/orthocare-logo-horizontal-transparent.png"
              alt="Orthocare Physiotherapy Clinic"
              width="1400"
              height="420"
              className="h-auto w-[138px] max-[360px]:w-[116px] sm:w-[190px] xl:w-[208px]"
            />
          </a>

          <nav aria-label="Main navigation" className="hidden items-center gap-4 text-sm font-semibold text-slate-700 xl:flex 2xl:gap-6">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={VIEW_PATHS[link.id]}
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick(link.id);
                }}
                aria-current={activeView === link.id ? 'page' : undefined}
                className={`whitespace-nowrap rounded-sm border-b-2 py-2 transition-colors hover:text-blue-900 ${
                  activeView === link.id
                    ? 'border-amber-600 font-bold text-blue-900'
                    : 'border-transparent text-slate-600'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 max-[360px]:gap-0.5 sm:gap-2">
            <button
              onClick={toggleLanguage}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 max-[280px]:hidden sm:px-2.5"
              title="Change Language / भाषा बदलें"
              aria-label={`Switch language to ${language === 'en' ? 'Hindi' : 'English'}`}
            >
              <Languages className="h-4 w-4 text-blue-900" aria-hidden="true" />
              <span className="max-[360px]:hidden">{language === 'en' ? 'हिंदी' : 'English'}</span>
            </button>

            <a
              href={`tel:${settings?.phone || '8864849409'}`}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-2 text-blue-900 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 xl:hidden sm:px-3"
              aria-label="Call clinic directly"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden text-xs font-semibold sm:inline">Call</span>
            </a>

            <a
              href={`tel:${settings?.phone || '8864849409'}`}
              className="hidden min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-slate-100 px-3.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 xl:inline-flex"
            >
              <Phone className="h-3.5 w-3.5 text-blue-900" aria-hidden="true" />
              <span className="tabular-nums">{settings?.phone || '8864849409'}</span>
            </a>

            <button
              onClick={() => openAppointmentModal()}
              aria-label={language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book an appointment'}
              className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-blue-900 px-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 max-[360px]:px-1.5 sm:px-4 md:min-w-0"
            >
              <Calendar className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span className="hidden sm:inline">{language === 'hi' ? 'अपॉइंटमेंट' : 'Book Appointment'}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 py-2.5 xl:hidden">
          <nav aria-label="Mobile navigation" className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={VIEW_PATHS[link.id]}
                onClick={(event) => {
                  event.preventDefault();
                  handleNavClick(link.id);
                }}
                aria-current={activeView === link.id ? 'page' : undefined}
                className={`flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1.5 py-2 text-center text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 sm:text-sm ${
                  activeView === link.id
                    ? 'bg-blue-50 font-bold text-blue-900 ring-1 ring-inset ring-blue-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="break-words leading-tight">{link.label}</span>
              </a>
            ))}
            <button
              onClick={toggleLanguage}
              className="hidden min-h-11 min-w-0 items-center justify-center rounded-xl px-1.5 py-2 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 max-[280px]:flex"
              aria-label={`Switch language to ${language === 'en' ? 'Hindi' : 'English'}`}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
