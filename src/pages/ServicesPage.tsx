import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClinic } from '../context/ClinicContext';
import { TreatmentService } from '../types';
import {
  Search,
  Calendar,
  Clock,
  Home,
  Activity,
  CheckCircle,
  X,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

export function ServicesPage() {
  const {
    services,
    categories,
    openAppointmentModal,
    setSelectedService,
    getWhatsappUrl,
    language,
  } = useClinic();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick suggestions for fast 1-tap filtering
  const quickKeywords = [
    { label: language === 'hi' ? 'कमर दर्द' : 'Back Pain', query: 'back' },
    { label: language === 'hi' ? 'सर्वाइकल' : 'Cervical', query: 'cervical' },
    { label: language === 'hi' ? 'घुटना रिहैब' : 'Knee Rehab', query: 'knee' },
    { label: language === 'hi' ? 'साइटिका' : 'Sciatica', query: 'sciatica' },
    { label: language === 'hi' ? 'लकवा / पैरालिसिस' : 'Paralysis', query: 'paralysis' },
    { label: language === 'hi' ? 'फ्रोजन शोल्डर' : 'Frozen Shoulder', query: 'shoulder' },
    { label: language === 'hi' ? 'होम विजिट' : 'Home Visit', query: 'home visit' },
    { label: language === 'hi' ? 'स्पोर्ट्स इंजरी' : 'Sports Injury', query: 'sports' },
  ];

  // Keyboard shortcut: Press '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter services by category AND search query (service name, category name, symptoms, descriptions)
  const visibleServices = useMemo(() => services.filter((s) => s.isVisible), [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return visibleServices.filter((service) => {
      // Category tab match
      const matchesCategoryTab =
        selectedCategoryId === 'all' || service.categoryId === selectedCategoryId;
      if (!matchesCategoryTab) return false;

      // If no search query, return category filter
      if (!query) return true;

      // Get category object for category keyword matching
      const category = categories.find((c) => c.id === service.categoryId);

      // Check service name (English & Hindi)
      const nameMatch =
        service.name.toLowerCase().includes(query) ||
        (service.nameHi && service.nameHi.toLowerCase().includes(query));

      // Check category name & description keywords (allows users to search "spine", "joint", "neuro", "sports")
      const categoryMatch =
        Boolean(category && (
          category.name.toLowerCase().includes(query) ||
          (category.nameHi && category.nameHi.toLowerCase().includes(query)) ||
          (category.description && category.description.toLowerCase().includes(query))
        ));

      // Check description (English & Hindi)
      const descMatch =
        service.description.toLowerCase().includes(query) ||
        (service.descriptionHi && service.descriptionHi.toLowerCase().includes(query)) ||
        (service.roleOfPhysio && service.roleOfPhysio.toLowerCase().includes(query)) ||
        (service.roleOfPhysioHi && service.roleOfPhysioHi.toLowerCase().includes(query));

      // Check common symptoms
      const symptomMatch = Boolean(
        service.commonSymptoms &&
        service.commonSymptoms.some((s) => s.toLowerCase().includes(query))
      );

      // Check special home visit keyword
      const homeVisitMatch =
        (query.includes('home') || query.includes('ghar') || query.includes('visit')) &&
        service.homeVisitEligible;

      return nameMatch || categoryMatch || descMatch || symptomMatch || homeVisitMatch;
    });
  }, [visibleServices, categories, selectedCategoryId, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
          <Activity className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'संपूर्ण उपचार सूची' : 'Comprehensive Clinical Care'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'hi'
            ? 'फिजियोथेरेपी एवं पुनर्वास सेवाएं'
            : 'Physiotherapy & Rehabilitation Treatments'}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          {language === 'hi'
            ? 'ऑर्थोकेयर क्लिनिक में प्रत्येक मरीज की व्यक्तिगत जांच कर लक्षित फिजियोथेरेपी कार्यक्रम तैयार किया जाता है। नीचे दी गई सभी 18 सेवाएं क्लिनिक एवं आवश्यकतानुसार घर पर उपलब्ध हैं।'
            : 'Search and explore all 18 certified treatments offered by Dr. Harshit Jain (PT). Use the instant search bar or category filters below to quickly locate the right therapy for your condition.'}
        </p>
      </div>

      {/* Interactive Search Bar & Filters Section */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        
        {/* Main Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search className="w-5 h-5 text-blue-900" />
          </div>

          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              language === 'hi'
                ? 'उपचार का नाम, श्रेणी या लक्षण खोजें (उदा: कमर दर्द, साइटिका, घुटना, फ्रोजन शोल्डर, नसों का दर्द)...'
                : 'Search treatments by name, category or symptoms (e.g. Back pain, Sciatica, Knee replacement, Neuro)...'
            }
            className="w-full pl-12 pr-28 py-3.5 text-sm sm:text-base border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 bg-slate-50/50 focus:bg-white"
          />

          {/* Right Action: Clear & Keyboard hint */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[11px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Quick Keyword Suggestion Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-900" />
            <span>{language === 'hi' ? 'त्वरित खोज:' : 'Quick search:'}</span>
          </span>
          {quickKeywords.map((kw, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSearchQuery(kw.query);
                searchInputRef.current?.focus();
              }}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                searchQuery.toLowerCase() === kw.query.toLowerCase()
                  ? 'bg-blue-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {kw.label}
            </button>
          ))}
        </div>

        {/* Category Segmented Buttons */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'hi' ? 'श्रेणी अनुसार फ़िल्टर' : 'Filter by Category'}</span>
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId('all');
                }}
                className="text-blue-900 hover:underline cursor-pointer lowercase"
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategoryId === 'all'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {language === 'hi' ? 'सभी 18 उपचार' : 'All Treatments'} ({visibleServices.length})
            </button>
            {categories.map((cat) => {
              const count = visibleServices.filter((s) => s.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryId === cat.id
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {language === 'hi' && cat.nameHi ? cat.nameHi : cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Count & Query Notice */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <div>
          Showing <span className="tabular-nums font-bold text-slate-900">{filteredServices.length}</span> of{' '}
          <span className="tabular-nums font-bold text-slate-900">{visibleServices.length}</span> treatment options
          {searchQuery && (
            <span className="ml-2 text-slate-600">
              for query <span className="font-semibold text-blue-900">"{searchQuery}"</span>
            </span>
          )}
        </div>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Treatment Cards Grid */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-slate-900">
              No treatments matched "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try searching with everyday terms like "back", "knee", "pain", "cervical", "joint", or clear the filters to view all treatments.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategoryId('all');
            }}
            className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-900 text-white hover:bg-blue-800 transition-colors shadow-xs cursor-pointer"
          >
            Reset Search & Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const category = categories.find((c) => c.id === service.categoryId);
            return (
              <div
                key={service.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-md"
              >
                <div className="space-y-4">
                  {/* Clean unboxed metadata */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-900">
                      {category?.name || 'Physiotherapy'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">~{service.durationMinutes} mins</span>
                    {service.homeVisitEligible && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-medium">Home Visit</span>
                      </>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                      {service.name}
                    </h2>
                    {service.nameHi && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{service.nameHi}</p>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {language === 'hi' && service.descriptionHi ? service.descriptionHi : service.description}
                  </p>

                  {/* Common symptoms snippet */}
                  {service.commonSymptoms && service.commonSymptoms.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Key Indications:
                      </p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {service.commonSymptoms.slice(0, 2).map((symp, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{symp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Bottom Action Strip */}
                <div className="pt-6 mt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedService(service)}
                      className="text-xs font-semibold text-blue-900 hover:text-blue-700 underline underline-offset-4 cursor-pointer"
                    >
                      {language === 'hi' ? 'पूरा विवरण पढ़ें' : 'Read Full Details'}
                    </button>

                    <a
                      href={getWhatsappUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <button
                    onClick={() => openAppointmentModal(service.name)}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book Appointment for this Treatment'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Medical Disclosure Note */}
      <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
        <p className="font-bold text-slate-800 uppercase tracking-wider">
          Patient Notice & Clinical Standards:
        </p>
        <p>
          At Orthocare Physiotherapy Clinic, treatments are delivered only after a proper physical assessment by Dr. Harshit Jain (PT). We do not guarantee unrealistic overnight cures; our protocols focus on steady pain reduction, joint stability, and long-term functional recovery.
        </p>
      </div>
    </div>
  );
}
