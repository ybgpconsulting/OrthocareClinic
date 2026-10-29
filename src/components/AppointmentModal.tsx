import React, { useState, useEffect, useRef } from 'react';
import { useClinic } from '../context/ClinicContext';
import { api } from '../api';
import { X, Calendar, Phone, CheckCircle2, AlertCircle, Home, Clock } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useDialogFocus } from '../hooks/useDialogFocus';

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
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('Morning (9:00 AM – 1:30 PM)');
  const [isHomeVisitRequested, setIsHomeVisitRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError(language === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter the patient name.');
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError(language === 'hi' ? 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.submitEnquiry({
        patientName: patientName.trim(),
        phoneNumber: cleanPhone,
        serviceRequested: serviceRequested || 'General Consultation',
        preferredDate,
        preferredTimeSlot,
        message,
        isHomeVisitRequested,
        website,
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit appointment enquiry. Please try calling directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setError(null);
    setPatientName('');
    setPhoneNumber('');
    setMessage('');
    setWebsite('');
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
                {language === 'hi' ? 'अनुरोध सफलतापूर्वक प्राप्त हुआ!' : 'Enquiry Received Successfully!'}
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {settings?.appointmentNotice ||
                  'Thank you. Submitting an enquiry does not automatically book a slot. Our clinic staff will call or WhatsApp you shortly to confirm availability.'}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
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
              <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
              {/* WhatsApp option before appointment details */}
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">Prefer instant confirmation?</p>
                <a
                  href={getWhatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>{language === 'hi' ? 'व्हाट्सएप पर तुरंत चैट करें' : 'Chat & Book Directly on WhatsApp'}</span>
                </a>
              </div>

              <div className="flex items-center gap-3 py-1" aria-hidden="true">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {language === 'hi' ? 'या फॉर्म भरें' : 'Or fill out the form'}
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

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
                    maxLength={24}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="8864849409"
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
                  onChange={(e) => setServiceRequested(e.target.value)}
                  className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.name}>
                      {srv.name} {srv.nameHi ? `(${srv.nameHi})` : ''}
                    </option>
                  ))}
                  <option value="General Consultation">General Physiotherapy Consultation</option>
                  <option value="Home Visit Evaluation">Home Visit Physical Evaluation</option>
                </select>
              </div>

              {/* Date & Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="appointment-date" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'पसंदीदा तारीख' : 'Preferred Date'}
                  </label>
                  <input
                    id="appointment-date"
                    type="date"
                    value={preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="appointment-time" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'समय स्लॉट' : 'Preferred Slot'}
                  </label>
                  <select
                    id="appointment-time"
                    value={preferredTimeSlot}
                    onChange={(e) => setPreferredTimeSlot(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                  >
                    <option value="Morning (9:00 AM – 1:30 PM)">Morning: 9:00 AM – 1:30 PM</option>
                    <option value="Evening (4:30 PM – 8:00 PM)">Evening: 4:30 PM – 8:00 PM</option>
                  </select>
                </div>
              </div>

              {/* Home visit checkbox */}
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
                disabled={isSubmitting}
                className="w-full h-13 sm:h-12 py-3 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm sm:text-base shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>
                  {isSubmitting
                    ? 'Submitting Request...'
                    : language === 'hi'
                    ? 'अपॉइंटमेंट अनुरोध भेजें'
                    : 'Submit Appointment Enquiry'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
