import React from 'react';
import { useClinic, VIEW_PATHS } from '../context/ClinicContext';
import { Clock, MapPin, Phone } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { formatDayHours, getWeeklyHours, WEEKDAYS } from '../utils/openingHours';

function getHoursSummary(settings: ReturnType<typeof useClinic>['settings']) {
  const schedule = getWeeklyHours(settings);
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Asia/Kolkata',
  }).format(new Date()).toLowerCase();
  const todayIndex = WEEKDAYS.findIndex(({ id }) => id === today);
  const groups: Array<{ hours: string; start: number; end: number }> = [];

  schedule.forEach((day, index) => {
    const hours = formatDayHours(day);
    const previousGroup = groups[groups.length - 1];
    if (previousGroup && previousGroup.hours === hours && previousGroup.end === index - 1) {
      previousGroup.end = index;
      return;
    }

    groups.push({
      hours,
      start: index,
      end: index,
    });
  });

  return groups.map(({ hours, start, end }) => ({
    days: start === end
      ? WEEKDAYS[start].label.slice(0, 3)
      : `${WEEKDAYS[start].label.slice(0, 3)}–${WEEKDAYS[end].label.slice(0, 3)}`,
    hours,
    isToday: todayIndex >= start && todayIndex <= end,
  }));
}

export function Footer() {
  const { settings, setActiveView, language, getWhatsappUrl } = useClinic();
  const phone = settings?.phone || '8864849409';

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300 pb-24 pt-8 sm:pt-10 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-7 border-b border-slate-800 pb-7 sm:grid-cols-2 lg:grid-cols-[1fr_0.65fr_1.35fr] lg:gap-8 lg:pb-8">
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
            <p className="max-w-xs text-sm leading-relaxed text-slate-300">
              {language === 'hi'
                ? 'डॉ. हर्षित जैन (पीटी) के नेतृत्व में बागपत एवं टटीरी क्षेत्र में फिजियोथेरेपी और पुनर्वास देखभाल।'
                : 'Physiotherapy, rehabilitation and pain relief care in Baghpat, led by Dr. Harshit Jain (PT).'}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              {settings?.doctorQualifications || 'BPT, COMT, MIAP, CNDS (Delhi)'}
            </p>
          </section>

          <nav aria-label="Footer navigation" className="space-y-3 lg:border-l lg:border-slate-800 lg:pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              {language === 'hi' ? 'त्वरित लिंक' : 'Explore'}
            </h3>
            <ul className="grid grid-cols-2 gap-1 text-sm text-slate-300 sm:grid-cols-1">
              <li>
                <a href={VIEW_PATHS.services} onClick={(event) => { event.preventDefault(); setActiveView('services'); }} className="inline-flex min-h-10 w-full items-center rounded-lg px-2 transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'उपचार' : 'Treatments'}
                </a>
              </li>
              <li>
                <a href={VIEW_PATHS.about} onClick={(event) => { event.preventDefault(); setActiveView('about'); }} className="inline-flex min-h-10 w-full items-center rounded-lg px-2 transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'डॉक्टर के बारे में' : 'About the Doctor'}
                </a>
              </li>
              <li>
                <a href={VIEW_PATHS.gallery} onClick={(event) => { event.preventDefault(); setActiveView('gallery'); }} className="inline-flex min-h-10 w-full items-center rounded-lg px-2 transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  {language === 'hi' ? 'क्लिनिक गैलरी' : 'Clinic Gallery'}
                </a>
              </li>
              <li>
                <a href={VIEW_PATHS.faqs} onClick={(event) => { event.preventDefault(); setActiveView('faqs'); }} className="inline-flex min-h-10 w-full items-center rounded-lg px-2 transition-colors hover:bg-slate-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
                  FAQs
                </a>
              </li>
            </ul>
          </nav>

          <section aria-labelledby="footer-visit" className="space-y-3 lg:border-l lg:border-slate-800 lg:pl-6">
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
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-3.5">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  {language === 'hi' ? 'क्लिनिक का समय' : 'Clinic hours'}
                </h4>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">
                  IST
                </span>
              </div>
              <ul aria-label="Clinic consultation hours, India Standard Time" className="space-y-1">
                {getHoursSummary(settings).map(({ days, hours, isToday }) => (
                  <li
                    key={days}
                    className={`flex min-h-9 flex-col gap-1 rounded-lg px-2.5 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-2 ${
                      isToday ? 'bg-emerald-950/60' : 'bg-slate-950/40'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`shrink-0 text-xs font-semibold ${isToday ? 'text-emerald-200' : 'text-slate-300'}`}>
                        {days}
                      </span>
                      {isToday && (
                        <span className="shrink-0 rounded-full bg-emerald-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                          {language === 'hi' ? 'आज' : 'Today'}
                        </span>
                      )}
                    </span>
                    <span className={`min-w-0 text-xs leading-relaxed lg:whitespace-nowrap lg:text-right ${hours === 'Closed' ? 'text-slate-400' : 'text-slate-200'}`}>
                      {hours}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-5 text-center sm:flex-row sm:items-center sm:text-left">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} {settings?.clinicName || 'Orthocare Physiotherapy Clinic'}. All rights reserved.
          </p>
          <a
            href="https://www.ybgp.in/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Looking to grow your business? Designed and developed by YBGP. Visit YBGP.in (opens in a new tab)"
            className="group flex max-w-full items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 shadow-lg shadow-black/10 transition-colors hover:border-slate-600 hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            <div className="min-w-0 space-y-0.5">
              <h2 className="text-sm font-bold tracking-tight text-white transition-colors group-hover:text-emerald-100">
                Looking to grow your business?
              </h2>
              <p className="text-xs text-slate-400">Designed and developed by YBGP</p>
            </div>
            <span className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg bg-white px-2.5 py-1.5 transition-opacity group-hover:opacity-90">
              <img src="/YBGP_logo.png" alt="YBGP.in" className="h-6 w-auto" width="80" height="32" />
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}
