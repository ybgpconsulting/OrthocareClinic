import { VIEW_PATHS } from './context/ClinicContext';

export const SITE_ORIGIN = 'https://orthocareclinic.in';

export const PAGE_METADATA: Record<string, { title: string; description: string; breadcrumbLabel: string }> = {
  home: {
    title: 'Physiotherapy Clinic in Baghpat | Orthocare',
    description: 'Orthocare Physiotherapy Clinic in Tatiri, Baghpat offers pain care, rehabilitation, home visits and online consultations with Dr. Harshit Jain (PT).',
    breadcrumbLabel: 'Home',
  },
  services: {
    title: 'Physiotherapy Treatments in Baghpat | Orthocare Clinic',
    description: 'Explore physiotherapy treatments in Baghpat for back and neck pain, sciatica, knee rehabilitation, sports injuries, stroke recovery and mobility.',
    breadcrumbLabel: 'Physiotherapy Treatments',
  },
  about: {
    title: 'Dr. Harshit Jain (PT) | Orthocare Clinic, Baghpat',
    description: 'Meet Dr. Harshit Jain (PT), physiotherapist at Orthocare Clinic in Aggarwal Mandi, Tatiri, Baghpat. Learn about his qualifications and care approach.',
    breadcrumbLabel: 'About the Clinic',
  },
  gallery: {
    title: 'Clinic Photos | Orthocare Physiotherapy, Baghpat',
    description: 'Browse photos of Orthocare Physiotherapy Clinic’s treatment rooms, rehabilitation space and equipment in Tatiri, Baghpat, Uttar Pradesh.',
    breadcrumbLabel: 'Clinic Gallery',
  },
  contact: {
    title: 'Contact a Physiotherapist in Baghpat | Orthocare',
    description: 'Call or message Orthocare Physiotherapy Clinic in Tatiri, Baghpat for directions, opening hours, appointment enquiries and home visits.',
    breadcrumbLabel: 'Contact',
  },
  faqs: {
    title: 'Physiotherapy FAQs | Orthocare Clinic, Baghpat',
    description: 'Answers about physiotherapy treatment, appointments, clinic hours, online consultations and home visits at Orthocare Clinic in Baghpat.',
    breadcrumbLabel: 'FAQs',
  },
  privacy: {
    title: 'Privacy Policy | Orthocare Physiotherapy Clinic',
    description: 'Read how Orthocare Physiotherapy Clinic prepares appointment messages for WhatsApp, what information the website stores, and your privacy choices.',
    breadcrumbLabel: 'Privacy Policy',
  },
  admin: {
    title: 'Clinic Administration | Orthocare',
    description: 'Orthocare Physiotherapy Clinic administration portal.',
    breadcrumbLabel: 'Administration',
  },
};

export function getCanonicalUrl(view: string) {
  return new URL(VIEW_PATHS[view] || '/', SITE_ORIGIN).href;
}

export function getRobotsContent(view: string) {
  return view === 'admin' ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
}
