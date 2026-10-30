import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { Phone, MapPin, Clock, CheckCircle2, AlertCircle, Home, Mail } from 'lucide-react';
import { WeeklyHours } from '../components/WeeklyHours';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import {
  buildAppointmentWhatsAppMessage,
  getAppointmentDateOptions,
} from '../utils/appointmentWhatsApp';

export function ContactPage() {
  const { settings, getWhatsappUrl, language, services } = useClinic();

  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceRequested, setServiceRequested] = useState('General Consultation');
  const [preferredDate, setPreferredDate] = useState(() => getAppointmentDateOptions('en')[0].value);
  const [isHomeVisitRequested, setIsHomeVisitRequested] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError(language === 'hi' ? 'कृपया अपना नाम दर्ज करें।' : 'Please enter the patient name.');
      return;
    }
    if (!/^\d{10}$/.test(phoneNumber)) {
      setError(language === 'hi' ? 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।' : 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const requestMessage = buildAppointmentWhatsAppMessage({
      patientName: patientName.trim(),
      phoneNumber,
      serviceRequested,
      preferredDate,
      isHomeVisitRequested,
      message,
    }, language);
    const url = getWhatsappUrl(requestMessage);
    setWhatsappUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsSuccess(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Title */}
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
          <MapPin className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'क्लिनिक संपर्क एवं पता' : 'Reach Our Clinic'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'hi'
            ? 'ऑर्थोकेयर फिजियोथेरेपी क्लिनिक से संपर्क करें'
            : 'Contact Orthocare Physiotherapy Clinic'}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          {language === 'hi'
            ? 'अपॉइंटमेंट, रास्ते या होम विजिट की जानकारी के लिए सीधे फोन करें या व्हाट्सएप पर संदेश भेजें।'
            : 'Call or message us on WhatsApp about appointments, directions, or home visits at our Tatiri, Baghpat clinic.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Call & WhatsApp Action Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Direct Contact Numbers</h2>

            <a
              href={`tel:${settings?.phone || '8864849409'}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Tap to Call Doctor / Clinic</span>
                <span className="text-base font-bold tabular-nums">{settings?.phone || '8864849409'}</span>
              </div>
            </a>

            <a
              href={getWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xs text-emerald-100 block">Chat on WhatsApp</span>
                <span className="text-base font-bold tabular-nums">+91 {settings?.phone || '8864849409'}</span>
              </div>
            </a>
          </div>

          {/* Address & Hours Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block text-sm">Clinic Location:</span>
                <p className="mt-0.5">{settings?.address || 'Main Road, Aggarwal Mandi, Tatiri, Baghpat, Uttar Pradesh – 250609'}</p>
                <p className="text-xs text-slate-500 mt-1">{settings?.addressLandmark || 'Near Aggarwal Mandi Market'}</p>
                <div className="pt-2">
                  <a
                    href={settings?.googleMapsUrl || 'https://maps.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 hover:text-blue-700 underline underline-offset-4"
                  >
                    <span>Open in Google Maps Application</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
              <Clock className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block text-sm">Consultation Hours:</span>
                <WeeklyHours settings={settings} />
              </div>
            </div>

            {settings?.email && (
              <div className="flex items-start gap-3 pt-3 border-t border-slate-100 text-xs">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 block">Email Address:</span>
                  <a href={`mailto:${settings.email}`} className="text-blue-900 hover:underline">
                    {settings.email}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Home Visit Notice */}
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Home className="w-4 h-4 text-blue-800" />
              <span>{language === 'hi' ? 'होम विजिट फिजियोथेरेपी' : 'Home Visits Available'}</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              {settings?.homeVisitNote ||
                'Bedside physiotherapy is provided for elderly, bedridden or post-surgery patients in Baghpat, Tatiri and nearby areas. Please contact the clinic to verify slot schedule.'}
            </p>
          </div>
        </div>

        {/* WhatsApp Appointment Request */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
          <div className="mb-6 space-y-1">
            <h2 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'व्हाट्सएप पर अपॉइंटमेंट अनुरोध' : 'Prepare an Appointment Message'}
            </h2>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? 'विवरण भरें; आपका संदेश व्हाट्सएप में खुलेगा। अनुरोध भेजने के लिए आपको WhatsApp में Send दबाना होगा।'
                : 'Enter your details to prepare a WhatsApp message. You must tap Send in WhatsApp to submit your request.'}
            </p>
          </div>

          {isSuccess ? (
            <div role="status" aria-live="polite" className="text-center py-10 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {language === 'hi' ? 'व्हाट्सएप संदेश तैयार है' : 'WhatsApp message is ready'}
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                {language === 'hi'
                  ? 'यदि व्हाट्सएप अपने आप नहीं खुला, तो नीचे दिए बटन से संदेश खोलें। अनुरोध भेजने के लिए WhatsApp में Send दबाएं। यह वेबसाइट आपकी जानकारी सेव नहीं करती।'
                  : 'If WhatsApp did not open, use the button below. Review the message and tap Send there to submit your request. This website does not store these details.'}
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
                {language === 'hi' ? 'व्हाट्सएप संदेश खोलें' : 'Open WhatsApp message'}
              </a>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setPatientName('');
                  setPhoneNumber('');
                  setPreferredDate(getAppointmentDateOptions(language)[0].value);
                  setMessage('');
                  setIsHomeVisitRequested(false);
                  setWhatsappUrl('');
                }}
                className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                {language === 'hi' ? 'दूसरा अनुरोध तैयार करें' : 'Prepare Another Request'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" aria-live="assertive" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-patient-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'मरीज का नाम *' : 'Patient Full Name *'}
                  </label>
                  <input
                    id="contact-patient-name"
                    type="text"
                    required
                    maxLength={120}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Satish Kumar"
                    className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="contact-phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'मोबाइल नंबर *' : 'Phone Number (10 digits) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-base sm:text-sm font-semibold text-slate-400">
                      +91
                    </span>
                    <input
                      id="contact-phone"
                      type="tel"
                      required
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      minLength={10}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="8864849409"
                      autoComplete="tel-national"
                      className="w-full pl-14 pr-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none tabular-nums transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-service" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'उपचार / समस्या' : 'Service / Concern'}
                  </label>
                  <select
                    id="contact-service"
                    value={serviceRequested}
                    onChange={(e) => setServiceRequested(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                  >
                    <option value="General Consultation">General Physiotherapy Consultation</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    {language === 'hi' ? 'पसंदीदा तारीख' : 'Preferred Date'}
                  </label>
                  <select
                    id="contact-date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all"
                  >
                    {getAppointmentDateOptions(language).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Home visit toggle */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHomeVisitRequested}
                    onChange={(e) => setIsHomeVisitRequested(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">
                      {language === 'hi' ? 'घर पर फिजियोथेरेपी (होम विजिट) का अनुरोध करें' : 'I am requesting a Home Visit evaluation'}
                    </span>
                    <span className="text-slate-600">
                      Check this if patient is unable to travel to our clinic in Tatiri.
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  {language === 'hi' ? 'समस्या या संदेश (वैकल्पिक)' : 'Describe your problem / symptoms (Optional)'}
                </label>
                <textarea
                  id="contact-message"
                  rows={3}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Knee pain after standing, previous surgery notes, etc."
                  className="w-full px-4 py-3 text-base sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none resize-none transition-all"
                />
              </div>

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

      {/* Embedded Map Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          Clinic Location on Map (Tatiri, Baghpat)
        </h2>
        <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100">
          <iframe
            title="Orthocare Physiotherapy Clinic Map"
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
  );
}
