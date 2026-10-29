import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { ChevronDown, Clock, MapPin, Phone } from 'lucide-react';
import { WeeklyHours } from './WeeklyHours';
import { WhatsAppIcon } from './WhatsAppIcon';

export function Footer() {
  const { settings, setActiveView, language, getWhatsappUrl } = useClinic();
  const phone = settings?.phone || '8864849409';

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300 pb-24 pt-8 sm:pt-10 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-lg shadow-black/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
              Looking to grow your business?
            </h2>
            <p className="text-sm text-slate-400">Designed and developed by YBGP</p>
          </div>
          <a
            href="https://www.ybgp.in/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="YBGP.in, designed and developed this website (opens in a new tab)"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            <img src="/YBGP_logo.png" alt="YBGP.in" className="h-8 w-auto" width="80" height="32" />
          </a>
        </div>

        <div className="grid grid-cols-1 gap-7 border-b border-slate-800 pb-7 sm:grid-cols-2 lg:grid-cols-[1fr_0.8fr_1.2fr] lg:gap-10 lg:pb-8">
          <section aria-labelledby="footer-clinic" className="space-y-3">
            <div id="footer-clinic" className="flex w-fit items-center rounded-lg bg-white px-2.5 py-1.5">
              <img
                src="/logos/orthocare-logo-horizontal-transparent.png"
                alt="Orthocare Physiotherapy Clinic"
                width="1400"
                height="420"
                className="h-auto w-40"
              />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-300">
              {language === 'hi'
                ? 'डॉ. हर्षित जैन (पीटी) के नेतृत्व में बागपत एवं टटीरी क्षेत्र में फिजियोथेरेपी और पुनर्वास देखभाल।'
                : 'Physiotherapy, rehabilitation and pain relief care in Baghpat, led by Dr. Harshit Jain (PT).'}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              {settings?.doctorQualifications || 'BPT, COMT, MIAP, CNDS (Delhi)'}
            </p>
          </section>

          <nav aria-label="Footer navigation" className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              {language === 'hi' ? 'त्वरित लिंक' : 'Explore'}
            </h3>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-300 sm:grid-cols-1">
              <li>
                <button onClick={() => setActiveView('services')} className="inline-flex min-h-9 items-center rounded-md pr-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'उपचार' : 'Treatments'}
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('about')} className="inline-flex min-h-9 items-center rounded-md pr-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'डॉक्टर के बारे में' : 'About the Doctor'}
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('gallery')} className="inline-flex min-h-9 items-center rounded-md pr-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'क्लिनिक गैलरी' : 'Clinic Gallery'}
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('faqs')} className="inline-flex min-h-9 items-center rounded-md pr-2 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  FAQs
                </button>
              </li>
            </ul>
          </nav>

          <section aria-labelledby="footer-visit" className="space-y-3">
            <h3 id="footer-visit" className="text-xs font-semibold uppercase tracking-wider text-white">
              {language === 'hi' ? 'क्लिनिक एवं संपर्क' : 'Visit & Contact'}
            </h3>
            <div className="flex items-start gap-2.5 text-sm text-slate-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="leading-relaxed">{settings?.address || 'Main Road, Aggarwal Mandi, Tatiri, Baghpat – 250609'}</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a href={`tel:${phone}`} className="inline-flex min-h-9 items-center gap-2 rounded-md text-slate-200 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                <Phone className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                <span>{phone}</span>
              </a>
              <a href={getWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-md text-slate-200 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                <WhatsAppIcon className="h-4 w-4 text-emerald-300" />
                <span>WhatsApp</span>
              </a>
              <a href={settings?.googleMapsUrl || 'https://maps.google.com'} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-md font-semibold text-emerald-300 underline underline-offset-4 transition-colors hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                {language === 'hi' ? 'Google Maps में खोलें' : 'Open in Google Maps'}
              </a>
            </div>
            <details className="group border-t border-slate-800 pt-2">
              <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-200 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                <Clock className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                <span>{language === 'hi' ? 'क्लिनिक के समय देखें' : 'View clinic hours'}</span>
                <ChevronDown className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="pt-2">
                <WeeklyHours settings={settings} variant="dark" compact />
              </div>
            </details>
          </section>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-5 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} {settings?.clinicName || 'Orthocare Physiotherapy Clinic'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
