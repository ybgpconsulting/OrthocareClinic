type Validator = (value: unknown) => boolean;

const isString = (maxLength: number, minLength = 0): Validator =>
  (value) => typeof value === 'string' && value.trim().length >= minLength && value.length <= maxLength;

const isOptionalString = (maxLength: number): Validator =>
  (value) => value === undefined || isString(maxLength)(value);

const isBoolean: Validator = (value) => typeof value === 'boolean';

const isOptionalBoolean: Validator = (value) => value === undefined || isBoolean(value);

const isNumber = (min: number, max: number): Validator =>
  (value) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

const isOptionalNumber = (min: number, max: number): Validator =>
  (value) => value === undefined || isNumber(min, max)(value);

const isEnum = (values: readonly string[]): Validator =>
  (value) => typeof value === 'string' && values.includes(value);

const isOptionalEnum = (values: readonly string[]): Validator =>
  (value) => value === undefined || isEnum(values)(value);

const isStringArray = (maxItems: number, maxItemLength: number): Validator =>
  (value) => Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isString(maxItemLength, 1)(item));

const isOptionalStringArray = (maxItems: number, maxItemLength: number): Validator =>
  (value) => value === undefined || isStringArray(maxItems, maxItemLength)(value);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateWeeklyHours(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 7) return false;
  const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return value.every((day) => {
    if (!isPlainObject(day)) return false;
    if (Object.keys(day).some((key) => !['day', 'isClosed', 'intervals', 'note'].includes(key))) return false;
    if (!isEnum(weekdays)(day.day) || !isBoolean(day.isClosed)) return false;
    if (!isOptionalString(200)(day.note)) return false;
    if (!Array.isArray(day.intervals) || day.intervals.length > 2) return false;
    return day.intervals.every((interval) =>
      isPlainObject(interval) &&
      Object.keys(interval).every((key) => key === 'open' || key === 'close') &&
      typeof interval.open === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(interval.open) &&
      typeof interval.close === 'string' &&
      /^([01]\d|2[0-3]):[0-5]\d$/.test(interval.close)
    );
  });
}

const isOptionalWeeklyHours: Validator = (value) => value === undefined || validateWeeklyHours(value);

const isHttpsUrl: Validator = (value) => {
  if (typeof value !== 'string' || value.length > 2000) return false;
  if (value === '') return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

const isOptionalIsoDate: Validator = (value) => {
  if (value === undefined || value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export function isSafeImagePath(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length <= 300 &&
    /^\/images\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif|gif)$/i.test(value) &&
    !value.includes('..');
}

const isOptionalImagePath: Validator = (value) => value === undefined || value === '' || isSafeImagePath(value);

export function validatePayload(
  value: unknown,
  rules: Record<string, Validator>,
  requiredFields: string[] = []
): string | null {
  if (!isPlainObject(value)) return 'Request body must be a JSON object.';

  const unexpectedField = Object.keys(value).find((key) => !Object.prototype.hasOwnProperty.call(rules, key));
  if (unexpectedField) return 'Request contains an unsupported field.';

  const missingField = requiredFields.find((key) => value[key] === undefined);
  if (missingField) return 'A required field is missing.';

  for (const [key, fieldValue] of Object.entries(value)) {
    if (!rules[key](fieldValue)) return `Field "${key}" has an invalid value or exceeds its allowed length.`;
  }

  return null;
}

export const settingsRules: Record<string, Validator> = {
  clinicName: isOptionalString(160),
  doctorName: isOptionalString(160),
  doctorQualifications: isOptionalString(300),
  phone: isOptionalString(30),
  whatsappNumber: isOptionalString(30),
  defaultWhatsappMessage: isOptionalString(500),
  address: isOptionalString(500),
  addressLandmark: isOptionalString(300),
  city: isOptionalString(160),
  pincode: isOptionalString(20),
  state: isOptionalString(100),
  email: isOptionalString(254),
  openingHoursWeekday: isOptionalString(300),
  openingHoursSunday: isOptionalString(300),
  weeklyHours: isOptionalWeeklyHours,
  googleMapsUrl: isHttpsUrl,
  googleMapsEmbedUrl: isHttpsUrl,
  appointmentNotice: isOptionalString(1000),
  homeVisitAvailable: isOptionalBoolean,
  homeVisitNote: isOptionalString(1000),
};

export const contentRules: Record<string, Validator> = {
  heroTagline: isOptionalString(300),
  heroHeadline: isOptionalString(300),
  heroHeadlineHi: isOptionalString(300),
  heroSubtitle: isOptionalString(2000),
  heroSubtitleHi: isOptionalString(2000),
  aboutTitle: isOptionalString(300),
  aboutText: isOptionalString(6000),
  aboutTextHi: isOptionalString(6000),
  aboutExperience: isOptionalString(2000),
  aboutDoctorBio: isOptionalString(6000),
  aboutDoctorBioHi: isOptionalString(6000),
  announcementText: isOptionalString(1000),
  announcementActive: isOptionalBoolean,
  privacyPolicy: isOptionalString(12000),
  treatmentBannerText: isOptionalString(1000),
};

export const categoryRules: Record<string, Validator> = {
  name: isString(160, 1),
  nameHi: isOptionalString(160),
  order: isOptionalNumber(0, 10000),
  description: isOptionalString(1200),
};

export const serviceRules: Record<string, Validator> = {
  name: isString(160, 1),
  nameHi: isOptionalString(160),
  categoryId: isString(100, 1),
  description: isString(4000, 1),
  descriptionHi: isOptionalString(4000),
  roleOfPhysio: isOptionalString(2000),
  roleOfPhysioHi: isOptionalString(2000),
  commonSymptoms: isOptionalStringArray(30, 160),
  durationMinutes: isOptionalNumber(1, 240),
  priceNote: isOptionalString(200),
  homeVisitEligible: isOptionalBoolean,
  isVisible: isOptionalBoolean,
  order: isOptionalNumber(0, 10000),
  image: isOptionalImagePath,
};

export const galleryRules: Record<string, Validator> = {
  title: isString(160, 1),
  category: isOptionalEnum(['clinic_exterior', 'consultation', 'rehabilitation', 'equipment']),
  url: (value) => isSafeImagePath(value),
  alt: isOptionalString(300),
  caption: isOptionalString(2000),
  order: isOptionalNumber(0, 10000),
  isVisible: isOptionalBoolean,
};

export const faqRules: Record<string, Validator> = {
  question: isString(1200, 1),
  questionHi: isOptionalString(1200),
  answer: isString(6000, 1),
  answerHi: isOptionalString(6000),
  category: isOptionalString(100),
  order: isOptionalNumber(0, 10000),
  isVisible: isOptionalBoolean,
};

export const enquiryRules: Record<string, Validator> = {
  patientName: isString(120, 2),
  phoneNumber: isString(24, 1),
  serviceRequested: isOptionalString(160),
  preferredDate: isOptionalIsoDate,
  preferredTimeSlot: isOptionalString(120),
  message: isOptionalString(2000),
  isHomeVisitRequested: isOptionalBoolean,
  website: isOptionalString(200),
};

export const enquiryStatusRules: Record<string, Validator> = {
  status: isEnum(['new', 'contacted', 'scheduled', 'completed', 'closed']),
  internalNotes: isOptionalString(2000),
};

export const loginRules: Record<string, Validator> = {
  password: isString(128, 1),
};

export const passwordChangeRules: Record<string, Validator> = {
  currentPassword: isString(128, 1),
  newPassword: isString(128, 1),
};

export const deleteCategoryRules: Record<string, Validator> = {
  fallbackCategoryId: isOptionalString(100),
};
