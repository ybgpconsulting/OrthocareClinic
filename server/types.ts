export interface ClinicSettings {
  clinicName: string;
  doctorName: string;
  doctorQualifications: string;
  phone: string;
  whatsappNumber: string;
  defaultWhatsappMessage: string;
  address: string;
  addressLandmark: string;
  city: string;
  pincode: string;
  state: string;
  email: string;
  openingHoursWeekday: string;
  openingHoursSunday: string;
  weeklyHours?: DayOpeningHours[];
  googleMapsUrl: string;
  googleMapsEmbedUrl: string;
  appointmentNotice: string;
  homeVisitAvailable: boolean;
  homeVisitNote: string;
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface OpeningTimeRange {
  open: string;
  close: string;
}

export interface DayOpeningHours {
  day: Weekday;
  isClosed: boolean;
  intervals: OpeningTimeRange[];
  note?: string;
}

export interface ClinicContent {
  heroTagline: string;
  heroHeadline: string;
  heroHeadlineHi: string;
  heroSubtitle: string;
  heroSubtitleHi: string;
  aboutTitle: string;
  aboutText: string;
  aboutTextHi: string;
  aboutExperience: string;
  aboutDoctorBio: string;
  aboutDoctorBioHi: string;
  announcementText: string;
  announcementActive: boolean;
  privacyPolicy: string;
  treatmentBannerText: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  nameHi: string;
  order: number;
  description?: string;
}

export interface TreatmentService {
  id: string;
  categoryId: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  roleOfPhysio: string;
  roleOfPhysioHi: string;
  commonSymptoms: string[];
  durationMinutes: number;
  priceNote?: string;
  homeVisitEligible: boolean;
  isVisible: boolean;
  order: number;
  image?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'clinic_exterior' | 'consultation' | 'rehabilitation' | 'equipment';
  url: string;
  alt: string;
  caption: string;
  order: number;
  isVisible: boolean;
}

export interface FAQItem {
  id: string;
  question: string;
  questionHi: string;
  answer: string;
  answerHi: string;
  category: string;
  order: number;
  isVisible: boolean;
}

export interface PatientEnquiry {
  id: string;
  patientName: string;
  phoneNumber: string;
  serviceRequested: string;
  preferredDate?: string;
  preferredTimeSlot?: string;
  message?: string;
  isHomeVisitRequested: boolean;
  status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'closed';
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicDatabase {
  settings: ClinicSettings;
  content: ClinicContent;
  categories: ServiceCategory[];
  services: TreatmentService[];
  gallery: GalleryItem[];
  faqs: FAQItem[];
  enquiries: PatientEnquiry[];
  adminPasswordHash: string; // PBKDF2 hash
  adminSalt: string;
}
