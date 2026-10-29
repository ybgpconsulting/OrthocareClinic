import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { TreatmentService } from '../types';
import { WeeklyHours } from '../components/WeeklyHours';
import {
  Phone,
  Calendar,
  CheckCircle2,
  MapPin,
  Clock,
  Home,
  ShieldCheck,
  ChevronRight,
  Activity,
  Award,
  ArrowRight,
  Sparkles,
  Stethoscope,
  HeartPulse,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { ResponsiveImage } from '../components/ResponsiveImage';

export function HomePage() {
  const {
    settings,
    content,
    categories,
    services,
    gallery,
    openAppointmentModal,
    setSelectedService,
    setActiveView,
    getWhatsappUrl,
    language,
  } = useClinic();

  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  // Filtered services for showcase
  const visibleServices = services.filter((s) => s.isVisible);
  const featuredServices =
    selectedCatId === 'all'
      ? visibleServices.slice(0, 6)
      : visibleServices.filter((s) => s.categoryId === selectedCatId);

  const heroImage = '/images/orthocare-clinic-front.png';
  const doctorPhoto = '/images/physiotherapist_consultation_1793268957627.jpg';

  // Common condition quick navigation items (Mobile First convenience)
  const commonConditions = [
    { name: language === 'hi' ? 'कमर दर्द / साइटिका' : 'Back & Sciatica', categoryId: 'cat-back-neck' },
    { name: language === 'hi' ? 'सर्वाइकल / गर्दन' : 'Neck & Cervical', categoryId: 'cat-back-neck' },
    { name: language === 'hi' ? 'घुटने का दर्द / रिहैब' : 'Knee Rehab (TKR)', categoryId: 'cat-knee-rehab' },
    { name: language === 'hi' ? 'फ्रोजन शोल्डर' : 'Frozen Shoulder', categoryId: 'cat-shoulder-elbow' },
    { name: language === 'hi' ? 'लकवा / पैरालिसिस' : 'Paralysis & Stroke', categoryId: 'cat-neuro-rehab' },
    { name: language === 'hi' ? 'घर पर फिजियोथेरेपी' : 'Home Visit Care', categoryId: 'cat-home-visits' },
  ];

  return (
    <div className="space-y-12 sm:space-y-20 pb-20 sm:pb-24">
      <div>
      
      {/* Top Clinical Announcement Bar */}
      {content?.announcementActive && content?.announcementText && (
        <aside aria-label="Announcement" className="bg-slate-900 text-slate-100 py-2.5 px-4 text-xs font-medium text-center border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="line-clamp-1">{content.announcementText}</span>
          </div>
        </aside>
      )}

      {/* ================= HERO SECTION (Mobile Experience First) ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-100 p-5 sm:p-8 lg:p-10 shadow-sm">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5 sm:space-y-6">
            
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-900 text-xs font-bold uppercase tracking-wider w-fit">
              <Activity className="w-3.5 h-3.5 text-amber-700" />
              <span>{content?.heroTagline || 'Certified Physiotherapy & Pain Relief Care in Baghpat'}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
              {language === 'hi' && content?.heroHeadlineHi
                ? content.heroHeadlineHi
                : content?.heroHeadline || 'Physiotherapy & Pain Relief Centre in Baghpat'}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              {language === 'hi' && content?.heroSubtitleHi
                ? content.heroSubtitleHi
                : content?.heroSubtitle ||
                  'Back pain, knee pain, joint pain or difficulty moving? Contact Orthocare Physiotherapy Clinic to discuss your needs and available treatment options.'}
            </p>

            {/* Doctor Credentials & Facility Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">
                    {settings?.doctorName || 'Dr. Harshit Jain (PT)'}
                  </p>
                  <p className="text-xs font-semibold text-blue-900">
                    {settings?.doctorQualifications || 'BPT, COMT, MIAP, CNDS (Delhi)'}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-500 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 flex items-center sm:block gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-600 sm:hidden inline" />
                <span>Aggarwal Mandi, Tatiri, Baghpat</span>
              </div>
            </div>

            {/* Primary Action Buttons (Thumb friendly on mobile) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                onClick={() => openAppointmentModal()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book Appointment'}</span>
              </button>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5">
                <a
                  href={`tel:${settings?.phone || '8864849409'}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-98"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span className="tabular-nums">Call {settings?.phone || '8864849409'}</span>
                </a>

                <a
                  href={getWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition-all whitespace-nowrap active:scale-98"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Column */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-200/90 bg-slate-100 aspect-4/3 lg:h-full">
              <ResponsiveImage
                src={heroImage}
                alt="Front entrance and signboard of Orthocare Physiotherapy Clinic on Main Road, Tatiri, Baghpat"
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Physiotherapy · Rehabilitation · Wellness</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-white mt-1">
                  Orthocare Clinic, Tatiri
                </p>
                <p className="text-xs text-slate-300">
                  Main Road, Aggarwal Mandi · Home visits available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Symptom / Condition Navigator for Mobile Patients */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-amber-700" />
              <span>{language === 'hi' ? 'अपनी समस्या अनुसार सीधे चुनें:' : 'Quick Condition Finder:'}</span>
            </span>
            <button
              onClick={() => setActiveView('services')}
              className="text-xs font-semibold text-blue-900 hover:underline"
            >
              {language === 'hi' ? 'सभी देखें &rarr;' : 'All 18 Services &rarr;'}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {commonConditions.map((cond, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedCatId(cond.categoryId);
                  const el = document.getElementById('treatment-showcase');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200/80 transition-colors cursor-pointer active:scale-95"
              >
                {cond.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4-Item KPI Strip */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-blue-900" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-snug">Dr. Harshit Jain</span>
              <span className="block text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">BPT, COMT, MIAP, CNDS</span>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-snug">18 Treatments</span>
              <span className="block text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">Spine, joints & neuro</span>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-snug">Home Visits</span>
              <span className="block text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">Baghpat & surrounding</span>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-slate-800" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-slate-900 leading-snug">Main Road Tatiri</span>
              <span className="block text-[11px] sm:text-xs text-slate-500 font-medium leading-snug">Easy ground floor access</span>
            </div>
          </div>
        </div>
      </section>
      </div>

      {/* ================= SECTION 2: POPULAR TREATMENTS ================= */}
      <section id="treatment-showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-700" />
              <span>{language === 'hi' ? 'विशेष उपचार सेवाएं' : 'Specialized Clinical Care'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'hi' ? 'प्रमुख फिजियोथेरेपी उपचार' : 'Conditions Treated at Orthocare'}
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Evidence-based therapy protocols for pain relief, spinal decompression, and post-surgical joint mobility.
            </p>
          </div>

          <button
            onClick={() => setActiveView('services')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-900 hover:text-blue-700 transition-colors shrink-0"
          >
            <span>{language === 'hi' ? 'सभी 18 सेवाएं देखें' : 'View All 18 Treatments'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCatId === 'all'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {language === 'hi' ? 'सभी उपचार' : 'All Treatments'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCatId === cat.id
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {language === 'hi' && cat.nameHi ? cat.nameHi : cat.name}
            </button>
          ))}
        </div>

        {/* Services Grid (Zero-pill metadata discipline) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {featuredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                {/* Clean unboxed metadata with separators */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-blue-900">
                    {categories.find((c) => c.id === service.categoryId)?.name || 'Physiotherapy'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">~{service.durationMinutes} mins</span>
                  {service.homeVisitEligible && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-bold">Home Visit</span>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {service.name}
                  </h3>
                  {service.nameHi && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{service.nameHi}</p>
                  )}
                </div>

                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {language === 'hi' && service.descriptionHi ? service.descriptionHi : service.description}
                </p>

                {service.commonSymptoms && service.commonSymptoms.length > 0 && (
                  <div className="pt-1">
                    <ul className="space-y-1 text-xs text-slate-600">
                      {service.commonSymptoms.slice(0, 2).map((s, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedService(service)}
                  className="text-xs font-bold text-blue-900 hover:text-blue-700 underline underline-offset-4 cursor-pointer"
                >
                  {language === 'hi' ? 'विवरण पढ़ें' : 'View Details'}
                </button>

                <button
                  onClick={() => openAppointmentModal(service.name)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition-colors cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'hi' ? 'बुक करें' : 'Book'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 3: DOCTOR PROFILE & CLINICAL EXCELLENCE ================= */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl overflow-hidden shadow-md border border-slate-200 aspect-4/3 bg-white">
                <ResponsiveImage
                  src={doctorPhoto}
                  alt="Dr. Harshit Jain consulting patient on spine and joint posture"
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Credentials & Experience</span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                {content?.aboutTitle || 'Dedicated Care Led by Dr. Harshit Jain (PT)'}
              </h2>

              <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                {language === 'hi' && content?.aboutTextHi ? content.aboutTextHi : content?.aboutText}
              </p>

              {/* Verified Credentials 4-Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">BPT (Bachelor of Physiotherapy)</span>
                    <span className="text-slate-500">Clinical Physical Medicine & Rehabilitation</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">COMT (Orthopedic Manual Therapy)</span>
                    <span className="text-slate-500">Certified Orthopedic Manual Therapist · KIASTM specialist</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">MIAP</span>
                    <span className="text-slate-500">Member, Indian Association of Physiotherapists</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">CNDS (Delhi)</span>
                    <span className="text-slate-500">Certified Neuro-Developmental Specialist</span>
                  </div>
                </div>

              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveView('about')}
                  className="inline-flex items-center gap-2 text-sm font-bold text-blue-900 hover:text-blue-700"
                >
                  <span>Learn more about Dr. Harshit Jain & clinic standards</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: REAL CLINIC PHOTOGRAPHS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900 mb-1">
              <Activity className="w-3.5 h-3.5 text-amber-700" />
              <span>{language === 'hi' ? 'क्लिनिक की वास्तविक तस्वीरें' : 'Real Clinic Photos'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'hi' ? 'हमारा उपचार कक्ष एवं आधुनिक उपकरण' : 'Inside Orthocare Physiotherapy Clinic'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Clean, hygienic treatment rooms, therapeutic beds, and electrotherapy modalities in Tatiri.
            </p>
          </div>

          <button
            onClick={() => setActiveView('gallery')}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-900 hover:text-blue-700 transition-colors"
          >
            <span>{language === 'hi' ? 'पूरी गैलरी देखें' : 'View Full Gallery'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gallery.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-4/3 cursor-pointer shadow-xs hover:shadow-md transition-all"
              onClick={() => setActiveView('gallery')}
            >
              <ResponsiveImage
                src={item.url}
                alt={item.alt || item.title}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-end p-3.5 text-white">
                <p className="text-xs font-bold line-clamp-1">{item.title}</p>
                <p className="text-[11px] text-slate-300 line-clamp-1">{item.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION 5: HOME VISITS IN BAGHPAT & VILLAGES ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-12 relative overflow-hidden shadow-xl border border-slate-800">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-950 text-amber-400 text-xs font-bold uppercase tracking-wider border border-blue-900">
              <Home className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'होम विजिट सेवा' : 'Home Visit Physiotherapy'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {language === 'hi'
                ? 'क्या मरीज क्लिनिक आने में असमर्थ है?'
                : 'Unable to Travel to the Clinic in Person?'}
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {settings?.homeVisitNote ||
                'Dr. Harshit Jain provides bedside physiotherapy for elderly citizens, bedridden individuals, and post-surgery recovery in Aggarwal Mandi, Tatiri, Baghpat, and nearby village localities.'}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => openAppointmentModal('Home Visit Physiotherapy')}
                className="px-6 py-3.5 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-md hover:bg-slate-100 transition-colors cursor-pointer text-center"
              >
                {language === 'hi' ? 'घर पर फिजियोथेरेपी बुक करें' : 'Request Home Visit Service'}
              </button>

              <a
                href={`tel:${settings?.phone || '8864849409'}`}
                className="px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors tabular-nums text-center"
              >
                Call: {settings?.phone || '8864849409'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 6: LOCATION, TIMINGS & DIRECTIONS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
              <MapPin className="w-4 h-4 text-amber-700" />
              <span>{language === 'hi' ? 'क्लिनिक का पता एवं रूट' : 'Location & Directions'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {language === 'hi' ? 'टटीरी बागपत में आसानी से पहुंचे' : 'Conveniently Located on Main Road, Tatiri'}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              {language === 'hi'
                ? 'टटीरी या बागपत में अपने पास फिजियोथेरेपी क्लिनिक खोज रहे हैं? ऑर्थोकेयर में फिजियोथेरेपी, दर्द प्रबंधन और पुनर्वास देखभाल के लिए संपर्क करें।'
                : 'Looking for a physiotherapy clinic near you in Tatiri or Baghpat? Contact Orthocare for physiotherapy, pain management and rehabilitation care.'}
            </p>

            <div className="space-y-3.5 text-sm text-slate-700">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Full Clinic Address:
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {settings?.address || 'Main Road, Aggarwal Mandi, Tatiri, Baghpat – 250609'}
                </p>
                <p className="text-xs text-slate-500">{settings?.addressLandmark || 'Opposite Aggarwal Mandi Market'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Consultation Timings:
                </span>
                <WeeklyHours settings={settings} compact />
              </div>
            </div>

            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <a
                href={settings?.googleMapsUrl || 'https://maps.google.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm transition-colors text-center"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Get Google Maps Directions</span>
              </a>

              <a
                href={`tel:${settings?.phone || '8864849409'}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs sm:text-sm transition-colors text-center"
              >
                <Phone className="w-4 h-4 text-blue-900" />
                <span>Call Clinic</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="w-full h-80 sm:h-96 rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 relative">
              <iframe
                title="Orthocare Physiotherapy Clinic Location Map"
                src={settings?.googleMapsEmbedUrl || 'https://www.google.com/maps?q=X72C%2BRQ%2C%20Baghpat%2C%20Uttar%20Pradesh&output=embed'}
                width="100%"
                height="100%"
                className="border-0"
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
