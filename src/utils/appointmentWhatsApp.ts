export interface AppointmentWhatsAppDetails {
  patientName: string;
  phoneNumber: string;
  serviceRequested: string;
  preferredDate?: string;
  isHomeVisitRequested: boolean;
  message?: string;
}

export function getAppointmentDateOptions(language: 'en' | 'hi') {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  const formatDate = (date: Date) => new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
  }).format(date);
  const toDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return [
    {
      value: toDateValue(today),
      label: `${language === 'hi' ? 'आज' : 'Today'} (${formatDate(today)})`,
    },
    {
      value: toDateValue(tomorrow),
      label: `${language === 'hi' ? 'कल' : 'Tomorrow'} (${formatDate(tomorrow)})`,
    },
  ];
}

export function buildAppointmentWhatsAppMessage(
  details: AppointmentWhatsAppDetails,
  language: 'en' | 'hi'
): string {
  const isHindi = language === 'hi';
  const selectedDate = getAppointmentDateOptions(language)
    .find((option) => option.value === details.preferredDate)?.label;
  const lines = [
    isHindi
      ? 'नमस्ते! मैं ऑर्थोकेयर फिजियोथेरेपी क्लिनिक में अपॉइंटमेंट के बारे में पूछना चाहता/चाहती हूं।'
      : 'Namaste! I would like to enquire about an appointment at Orthocare Physiotherapy Clinic.',
    `${isHindi ? 'मरीज का नाम' : 'Patient name'}: ${details.patientName}`,
    `${isHindi ? 'मोबाइल नंबर' : 'Phone number'}: +91 ${details.phoneNumber}`,
    `${isHindi ? 'उपचार / समस्या' : 'Treatment / concern'}: ${details.serviceRequested}`,
    `${isHindi ? 'पसंदीदा तारीख' : 'Preferred date'}: ${selectedDate || (isHindi ? 'कोई प्राथमिकता नहीं' : 'No preference')}`,
    `${isHindi ? 'होम विजिट' : 'Home visit'}: ${details.isHomeVisitRequested ? (isHindi ? 'हाँ' : 'Yes') : (isHindi ? 'नहीं' : 'No')}`,
  ];

  if (details.message?.trim()) {
    lines.push(`${isHindi ? 'अतिरिक्त जानकारी' : 'Additional details'}: ${details.message.trim()}`);
  }

  lines.push(isHindi ? 'कृपया उपलब्धता की पुष्टि करें।' : 'Please confirm availability.');
  return lines.join('\n');
}
