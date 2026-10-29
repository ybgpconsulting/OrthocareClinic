import { VIEW_PATHS } from './context/ClinicContext';

export const SITE_ORIGIN = 'https://orthocareclinic.in';

export const PAGE_METADATA: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Orthocare Physiotherapy Clinic | Baghpat',
    description: 'Physiotherapy and rehabilitation care in Baghpat. Contact Orthocare Physiotherapy Clinic for appointment enquiries and home-visit availability.',
  },
  services: {
    title: 'Physiotherapy Treatments in Baghpat | Orthocare',
    description: 'Explore physiotherapy and rehabilitation treatments at Orthocare Clinic in Baghpat, including care for back pain, knee pain, sports injuries, and recovery.',
  },
  about: {
    title: 'About Orthocare Physiotherapy Clinic | Baghpat',
    description: 'Meet Dr. Harshit Jain (PT) and learn about Orthocare Physiotherapy Clinic in Aggarwal Mandi, Tatiri, Baghpat.',
  },
  gallery: {
    title: 'Clinic Gallery | Orthocare Physiotherapy Clinic, Baghpat',
    description: 'View the clinic, treatment spaces, and physiotherapy equipment at Orthocare Physiotherapy Clinic in Baghpat.',
  },
  contact: {
    title: 'Contact Orthocare Physiotherapy Clinic | Baghpat',
    description: 'Contact Orthocare Physiotherapy Clinic in Tatiri, Baghpat for appointment enquiries, directions, clinic hours, and home-visit availability.',
  },
  faqs: {
    title: 'Physiotherapy FAQs | Orthocare Clinic, Baghpat',
    description: 'Find answers about physiotherapy treatments, clinic hours, appointments, and home visits at Orthocare Clinic in Baghpat.',
  },
  privacy: {
    title: 'Privacy Policy | Orthocare Physiotherapy Clinic',
    description: 'Read how Orthocare Physiotherapy Clinic handles information submitted through its website and appointment enquiries.',
  },
  admin: {
    title: 'Clinic Administration | Orthocare',
    description: 'Orthocare Physiotherapy Clinic administration portal.',
  },
};

export function getCanonicalUrl(view: string) {
  return new URL(VIEW_PATHS[view] || '/', SITE_ORIGIN).href;
}

export function getRobotsContent(view: string) {
  return view === 'admin' ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
}
