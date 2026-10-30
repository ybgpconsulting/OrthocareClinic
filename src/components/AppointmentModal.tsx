import React, { useState, useEffect, useRef } from 'react';
import { useClinic } from '../context/ClinicContext';
import { X, Calendar, Phone, CheckCircle2, AlertCircle, Home } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useDialogFocus } from '../hooks/useDialogFocus';
import {
  buildAppointmentWhatsAppMessage,
  getAppointmentDateOptions,
} from '../utils/appointmentWhatsApp';

const ONLINE_CONSULTATION = 'Online Physiotherapy Consultation';

export function AppointmentModal() {
  const {
    isAppointmentModalOpen,
    setIsAppointmentModalOpen,
    prefilledServiceName,
    services,
    settings,
    getWhatsappUrl,
    language,
  } = useClinic();

  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceRequested, setServiceRequested] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => getAppointmentDateOptions('en')[0].value);
  const [isHomeVisitRequested, setIsHomeVisitRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogFocus(
    isAppointmentModalOpen,
    dialogRef,
    () => setIsAppointmentModalOpen(false),
    'input:not([type="hidden"]):not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled])',
  );

  useEffect(() => {
    if (prefilledServiceName) {
      setServiceRequested(prefilledServiceName);
    } else if (services.length > 0 && !serviceRequested) {
      setServiceRequested(services[0].name);
    }
  }, [prefilledServiceName, services]);

  if (!isAppointmentModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError(language === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter the patient name.');
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError(language === 'hi' ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const requestMessage = buildAppointmentWhatsAppMessage({
      patientName: patientName.trim(),
      phoneNumber,
      serviceRequested: serviceRequested || 'General Consultation',
      preferredDate,
      isHomeVisitRequested,
      message,
    }, language);
    const url = getWhatsappUrl(requestMessage);
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsSuccess(true);
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setError(null);
    setWhatsappUrl('');
    setPatientName('');
    setPhoneNumber('');
    setPreferredDate(getAppointmentDateOptions(language)[0].value);
    setMessage('');
    setIsHomeVisitRequested(false);
    setIsAppointmentModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-dialog-title"
        className="relative w-full max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col"
      >
        
        {/* Header with drag indicator for mobile */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 id="appointment-dialog-title" className="text-base sm:text-lg font-bold font-heading">
                {language === 'hi' ? 'अपॉइंटमेंट अनुरोध' : 'Book Clinic Appointment'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300">
                Orthocare Physiotherapy Clinic · Dr. Harshit Jain (PT)
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content with mobile safe padding */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 pb-safe">
          {isSuccess ? (
            <div role="status" aria-live="polite" className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-slate-900">
                {language === 'hi' ? 'व्हाट्सएप संदेश तैयार है' : 'WhatsApp message is ready'}
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {language === 'hi'
                  ? 'यदि व्हाट्सएप अपने आप नहीं खुला, तो नीचे दिए बटन से संदेश खोलें। अनुरोध भेजने के लिए WhatsApp में Send दबाएं। यह वेबसाइट आपकी जानकारी सेव नहीं करती।'
                  : 'If WhatsApp did not open, use the button below. Review the message and tap Send there to submit your request. This website does not store these details.'}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{language === 'hi' ? 'व्हाट्सएप संदेश खोलें' : 'Open WhatsApp message'}</span>
                </a>
                <a
                  href={`tel:${settings?.phone || '8864849409'}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 transition-colors"
                >
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>Call to Confirm: {settings?.phone || '8864849409'}</span>
                </a>

                <button
                  onClick={resetAndClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <a
                href={getWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                <span>{language === 'hi' ? 'WhatsApp पर सीधे संदेश भेजें' : 'Message us directly on WhatsApp'}</span>
              </a>

              <p className="text-center text-xs font-semibold text-slate-500">
                {language === 'hi' ? 'या अपॉइंटमेंट विवरण भरें' : 'Or fill in the appointment details'}
              </p>

              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950">
                {language === 'hi'
                  ? 'विवरण भरने के बाद व्हाट्सएप संदेश तैयार होगा। अनुरोध भेजने के लिए आपको WhatsApp में Send दबाना होगा। आपकी जानकारी इस वेबसाइट पर सेव नहीं होगी।'
                  : 'After you continue, a WhatsApp message is prepared. You must tap Send in WhatsApp to submit; this website does not store your enquiry.'}
              </p>

              {error && (
                <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Patient Name (font size >= 16px on mobile prevents auto-zoom) */}
              <div>
                <label htmlFor="appointment-patient-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'मरीज का नाम *' : 'Patient Name *'}
                </label>
                <input
                  id="appointment-patient-name"
                  type="text"
                  required
                  maxLength={120}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                />
              </div>

              {/* Phone number */}
              <div>
                <label htmlFor="appointment-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'मोबाइल नंबर *' : 'Phone Number (10 digits) *'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-base sm:text-sm font-semibold text-slate-400">
                    +91
                  </span>
                  <input
                    id="appointment-phone"
                    type="tel"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    minLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="8864849409"
                    autoComplete="tel-national"
                    className="w-full pl-14 pr-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all tabular-nums"
                  />
                </div>
              </div>

              {/* Service requested */}
              <div>
                <label htmlFor="appointment-service" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'उपचार / समस्या चुनें *' : 'Select Treatment / Concern *'}
                </label>
                <select
                  id="appointment-service"
                  value={serviceRequested}
                  onChange={(e) => {
                    setServiceRequested(e.target.value);
                    if (e.target.value === ONLINE_CONSULTATION) {
                      setIsHomeVisitRequested(false);
                    }
                  }}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.name}>
                      {srv.name} {srv.nameHi ? `(${srv.nameHi})` : ''}
                    </option>
                  ))}
                  {!services.some((service) => service.name === ONLINE_CONSULTATION) && (
                    <option value={ONLINE_CONSULTATION}>
                      {language === 'hi' ? 'ऑनलाइन फिजियोथेरेपी परामर्श' : ONLINE_CONSULTATION}
                    </option>
                  )}
                  <option value="General Consultation">General Physiotherapy Consultation</option>
                  <option value="Home Visit Evaluation">Home Visit Physical Evaluation</option>
                </select>
              </div>

              {/* Appointment date */}
              <div>
                <label htmlFor="appointment-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'पसंदीदा तारीख' : 'Preferred Date'}
                </label>
                <select
                  id="appointment-date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                >
                  {getAppointmentDateOptions(language).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {serviceRequested !== ONLINE_CONSULTATION && (
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHomeVisitRequested}
                      onChange={(e) => setIsHomeVisitRequested(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block">
                        {language === 'hi' ? 'घर पर फिजियोथेरेपी (होम विजिट) की आवश्यकता है' : 'I require Home Visit Physiotherapy at my residence'}
                      </span>
                      <span className="text-slate-600">
                        {language === 'hi'
                          ? 'बुजुर्ग या चलने में असमर्थ मरीजों के लिए टटीरी व बागपत में होम विजिट उपलब्ध है।'
                          : 'Available for elderly or post-surgery patients in Baghpat & Tatiri upon clinic confirmation.'}
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Message */}
              <div>
                <label htmlFor="appointment-message" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'लक्षण या विशेष जानकारी (वैकल्पिक)' : 'Specific Symptoms / Notes (Optional)'}
                </label>
                <textarea
                  id="appointment-message"
                  rows={2}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Pain since 2 weeks, difficulty climbing stairs..."
                  className="w-full px-4 py-2.5 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-13 sm:h-12 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4 text-amber-400" />
                <span>
                  {language === 'hi'
                    ? 'अपॉइंटमेंट अनुरोध भेजें'
                    : 'Continue to WhatsApp'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
