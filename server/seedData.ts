import { ClinicDatabase } from './types';
import crypto from 'crypto';

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512').toString('hex');
}

export function verifyPasswordHash(
  password: string,
  salt: string,
  storedHash: string
): { matches: boolean } {
  if (!/^[0-9a-f]{32}$/i.test(salt)) {
    throw new Error('Stored administrator password salt has an invalid format.');
  }
  if (!/^[0-9a-f]{128}$/i.test(storedHash)) {
    throw new Error('Stored administrator password hash uses an unsupported format.');
  }
  const expected = Buffer.from(storedHash, 'hex');
  const hexSaltCandidate = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 10_000, 64, 'sha512');
  const textSaltCandidate = crypto.pbkdf2Sync(password, salt, 10_000, 64, 'sha512');
  const matchesHexSalt = crypto.timingSafeEqual(hexSaltCandidate, expected);
  const matchesTextSalt = crypto.timingSafeEqual(textSaltCandidate, expected);
  return { matches: matchesHexSalt || matchesTextSalt };
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

const defaultSalt = generateSalt();
const defaultPasswordHash = hashPassword(
  process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(32).toString('hex'),
  defaultSalt
);

export const defaultDatabase: ClinicDatabase = {
  adminSalt: defaultSalt,
  adminPasswordHash: defaultPasswordHash,
  settings: {
    clinicName: 'Orthocare Physiotherapy Clinic',
    doctorName: 'Dr. Harshit Jain (PT)',
    doctorQualifications: 'BPT, COMT, MIAP, CNDS (Delhi)',
    phone: '8864849409',
    whatsappNumber: '918864849409',
    defaultWhatsappMessage: 'Namaste! Mujhe physiotherapy ke liye appointment book karni hai.',
    address: 'Main Road, Aggarwal Mandi Tatiri, Baghpat, Uttar Pradesh 250609',
    addressLandmark: 'Opposite Aggarwal Mandi Market, Main Road Tatiri',
    city: 'Tatiri, Baghpat',
    pincode: '250609',
    state: 'Uttar Pradesh',
    email: 'orthocareclinic.in@gmail.com',
    openingHoursWeekday: 'Monday – Friday: 9:00 AM – 8:00 PM; Saturday: 9:00 AM – 2:00 PM',
    openingHoursSunday: 'Sunday: Closed',
    weeklyHours: [
      { day: 'monday', isClosed: false, intervals: [{ open: '09:00', close: '20:00' }] },
      { day: 'tuesday', isClosed: false, intervals: [{ open: '09:00', close: '20:00' }] },
      { day: 'wednesday', isClosed: false, intervals: [{ open: '09:00', close: '20:00' }] },
      { day: 'thursday', isClosed: false, intervals: [{ open: '09:00', close: '20:00' }] },
      { day: 'friday', isClosed: false, intervals: [{ open: '09:00', close: '20:00' }] },
      { day: 'saturday', isClosed: false, intervals: [{ open: '09:00', close: '14:00' }] },
      { day: 'sunday', isClosed: true, intervals: [] },
    ],
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=X72C%2BRQ%2C%20Baghpat%2C%20Uttar%20Pradesh',
    googleMapsEmbedUrl: 'https://www.google.com/maps?q=X72C%2BRQ%2C%20Baghpat%2C%20Uttar%20Pradesh&output=embed',
    appointmentNotice: 'Please note: Submitting an enquiry does not automatically book a slot. Our clinic staff will call or WhatsApp you to confirm the appointment time.',
    homeVisitAvailable: true,
    homeVisitNote: 'Home visits are provided for elderly patients, post-surgery recovery, or bedridden patients in Baghpat, Tatiri, and nearby villages. Contact us to confirm slot availability.'
  },
  content: {
    heroTagline: 'Certified Physiotherapy & Pain Relief Care in Baghpat',
    heroHeadline: 'Physiotherapy & Pain Relief Centre in Baghpat',
    heroHeadlineHi: 'बागपत में फिजियोथेरेपी एवं दर्द निवारण केंद्र',
    heroSubtitle: 'Back pain, knee pain, joint pain or difficulty moving? Contact Orthocare Physiotherapy Clinic to discuss your needs and available treatment options.',
    heroSubtitleHi: 'कमर दर्द, घुटनों का दर्द, सर्वाइकल या चलने-फिरने में परेशानी? ऑर्थोकेयर फिजियोथेरेपी क्लिनिक से संपर्क करें।',
    aboutTitle: 'Dedicated Care Led by Dr. Harshit Jain (PT)',
    aboutText: 'Orthocare Physiotherapy Clinic is a specialized physical therapy and pain management facility located on Main Road, Aggarwal Mandi, Tatiri, Baghpat. Under the expert clinical guidance of Dr. Harshit Jain (PT), the clinic provides evidence-based, compassionate rehabilitation for patients suffering from acute and chronic orthopedic, neurological, and sports-related conditions.',
    aboutTextHi: 'ऑर्थोकेयर फिजियोथेरेपी क्लिनिक अग्रवाल मंडी टटीरी, बागपत में स्थित एक प्रमुख चिकित्सा केंद्र है। डॉ. हर्षित जैन (पीटी) के अनुभवी मार्गदर्शन में यहाँ कमर दर्द, घुटनों के दर्द, नसों की समस्या और पैरालिसिस का आधुनिक उपचार किया जाता है।',
    aboutExperience: 'Consultant Physiotherapist with specialized credentials in Orthopedic Manual Therapy (COMT) and Neurological & Sports Rehabilitation.',
    aboutDoctorBio: 'Dr. Harshit Jain holds qualifications including Bachelor of Physiotherapy (BPT), Certified Orthopedic Manual Therapist (COMT), Member of Indian Association of Physiotherapists (MIAP), and Certified Neuro-Developmental Specialist (CNDS, Delhi). He focuses on root-cause assessment, patient education, manual therapy, and tailored home exercise programs to restore natural mobility.',
    aboutDoctorBioHi: 'डॉ. हर्षित जैन (BPT, COMT, MIAP, CNDS दिल्ली) एक योग्य एवं अनुभवी फिजियोथेरेपिस्ट हैं। वे सटीक जांच, मैन्युअल थेरेपी और वैज्ञानिक व्यायामों के माध्यम से मरीजों को दर्द से राहत दिलाने में समर्पित हैं।',
    announcementText: 'Consultations available at clinic daily. Home visit slots can be booked via phone or WhatsApp.',
    announcementActive: true,
    privacyPolicy: 'Orthocare Physiotherapy Clinic respects your privacy. Any personal information (name, contact number, medical concern) provided through this website or appointment forms is used solely to coordinate appointments and clinical communications. We never sell, lease, or share patient data with third parties. For any inquiries regarding your information, please call us directly at 8864849409.',
    treatmentBannerText: 'Personalized treatment programs designed around each patient’s physical capability and lifestyle.'
  },
  categories: [
    { id: 'cat-back-neck', name: 'Back & Neck Pain', nameHi: 'कमर एवं गर्दन दर्द', order: 1, description: 'Targeted care for spinal tension, cervical stiffness, and sciatica.' },
    { id: 'cat-joints-arthritis', name: 'Joint Pain & Arthritis', nameHi: 'जोड़ों का दर्द एवं गठिया', order: 2, description: 'Mobility restoration and joint strengthening for chronic stiffness.' },
    { id: 'cat-knee-rehab', name: 'Knee Rehabilitation', nameHi: 'घुटने का पुनर्वास', order: 3, description: 'Pre and post-operative physical therapy for knee joint health.' },
    { id: 'cat-sports-injury', name: 'Sports Injury & Ligaments', nameHi: 'खेलकूद की चोटें व लिगामेंट', order: 4, description: 'Fast, safe recovery protocols for athletes and active individuals.' },
    { id: 'cat-shoulder-elbow', name: 'Shoulder & Elbow', nameHi: 'कंधे एवं कोहनी का दर्द', order: 5, description: 'Mobilization techniques for frozen shoulder and tennis elbow.' },
    { id: 'cat-foot-heel', name: 'Foot & Heel Pain', nameHi: 'एड़ी एवं पंजे का दर्द', order: 6, description: 'Relief from plantar fasciitis, heel spurs, and walking pain.' },
    { id: 'cat-spine-disc', name: 'Spine & Disc Problems', nameHi: 'रीढ़ की हड्डी एवं डिस्क समस्या', order: 7, description: 'Conservative non-surgical management for slipped disc and nerve compression.' },
    { id: 'cat-neuro-rehab', name: 'Neurological Rehabilitation', nameHi: 'न्यूरोलॉजिकल पुनर्वास', order: 8, description: 'Functional retraining for paralysis, stroke, and nerve mobility.' },
    { id: 'cat-balance-mobility', name: 'Balance & Mobility', nameHi: 'संतुलन एवं चाल सुधार', order: 9, description: 'Gait training and fall prevention for senior citizens and recovering patients.' },
    { id: 'cat-home-visits', name: 'Home Visit Physiotherapy', nameHi: 'घर पर फिजियोथेरेपी सेवा', order: 10, description: 'In-home care for patients unable to visit the clinic in person.' }
  ],
  services: [
    {
      id: 'srv-1',
      categoryId: 'cat-back-neck',
      name: 'Back Pain Physiotherapy',
      nameHi: 'कमर दर्द का फिजियोथेरेपी उपचार',
      description: 'Addresses muscle spasms, postural strain, lumbar disc irritation, and prolonged sitting discomfort.',
      descriptionHi: 'लगातार बैठने, झुकने या भारी सामान उठाने से होने वाले कमर दर्द और मांसपेशियों के खिंचाव का सटीक उपचार।',
      roleOfPhysio: 'Physiotherapy reduces acute muscle spasm through modalities (IFT, heat, gentle mobilization) followed by core muscle stabilization exercises to prevent recurrence.',
      roleOfPhysioHi: 'इलेक्ट्रोथेरेपी, हीट और मैन्युअल मोबिलाइजेशन से दर्द कम किया जाता है और कमर की मांसपेशियों को मजबूत बनाने के व्यायाम सिखाए जाते हैं।',
      commonSymptoms: ['Lower back stiffness', 'Difficulty standing upright', 'Muscle tightness', 'Pain when bending'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 1,
      image: '/images/clinic_treatment_room_1793268957681.jpg'
    },
    {
      id: 'srv-2',
      categoryId: 'cat-back-neck',
      name: 'Neck Pain and Cervical Physiotherapy',
      nameHi: 'गर्दन दर्द एवं सर्वाइकल फिजियोथेरेपी',
      description: 'Comprehensive rehabilitation for cervical spondylosis, neck stiffness, and radiating arm numbness.',
      descriptionHi: 'सर्वाइकल स्पोंडिलाइटिस, गर्दन में अकड़न और हाथों में झनझनाहट के लिए विशेष फिजियोथेरेपी।',
      roleOfPhysio: 'Gentle cervical traction, isometric neck strengthening, and posture correction exercises alleviate disc compression and restore smooth neck rotation.',
      roleOfPhysioHi: 'सर्वाइकल ट्रैक्शन, गर्दन की मांसपेशियों की स्ट्रेचिंग और पोस्चर सुधार व्यायामों द्वारा नसों का दबाव कम किया जाता है।',
      commonSymptoms: ['Stiff neck upon waking', 'Pain radiating to shoulders or arms', 'Head tightness', 'Restricted head turning'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 2,
      image: '/images/physiotherapist_consultation_1793268957627.jpg'
    },
    {
      id: 'srv-3',
      categoryId: 'cat-back-neck',
      name: 'Sciatica Pain Management',
      nameHi: 'साइटिका दर्द प्रबंधन',
      description: 'Physiotherapy protocol targeting compression or irritation of the sciatic nerve radiating down the leg.',
      descriptionHi: 'कमर से शुरू होकर नितंब और पैर तक जाने वाले तेज दर्द (साइटिका) का वैज्ञानिक फिजियोथेरेपी इलाज।',
      roleOfPhysio: 'Nerve mobilization (neurodynamics), gentle lumbar decompression, and pelvic stability drills to relieve sciatic nerve tension without aggressive sudden movements.',
      roleOfPhysioHi: 'नर्व मोबिलाइजेशन और कमर की नसों पर दबाव कम करने वाले सुरक्षित व्यायामों से पैर के दर्द व सुन्नपन में राहत मिलती है।',
      commonSymptoms: ['Sharp shooting pain down one leg', 'Numbness or tingling in calf or foot', 'Difficulty walking or standing'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 3,
      image: '/images/clinic_treatment_room_1793268957681.jpg'
    },
    {
      id: 'srv-4',
      categoryId: 'cat-back-neck',
      name: 'Cervicogenic Headache Management',
      nameHi: 'गर्दन से संबंधित सिरदर्द का उपचार',
      description: 'Therapeutic care for chronic tension headaches originating from tight upper neck muscles and cervical joints.',
      descriptionHi: 'गर्दन की ऊपरी नसों व मांसपेशियों में तनाव से उठने वाले सिरदर्द का फिजियोथेरेपी द्वारा समाधान।',
      roleOfPhysio: 'Suboccipital release, myofascial trigger point therapy, and ergonomic posture re-education to remove muscular triggers of recurring headaches.',
      roleOfPhysioHi: 'गर्दन की मांसपेशियों का तनाव कम करके सिरदर्द के मूल कारण को दूर किया जाता है।',
      commonSymptoms: ['One-sided headache spreading from base of skull', 'Neck tenderness', 'Worse with awkward neck postures'],
      durationMinutes: 35,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: false,
      isVisible: true,
      order: 4
    },
    {
      id: 'srv-5',
      categoryId: 'cat-joints-arthritis',
      name: 'Joint Pain Physiotherapy',
      nameHi: 'जोड़ों के दर्द का फिजियोथेरेपी उपचार',
      description: 'Therapeutic management for chronic or acute joint ache in hips, wrists, ankles, and fingers.',
      descriptionHi: 'हाथ, पैर, कलाई, कूल्हे या टखने के जोड़ों में दर्द व अकड़न का सुरक्षित इलाज।',
      roleOfPhysio: 'Joint mobilization techniques, active-assisted range of motion, and peri-articular muscle strengthening to reduce friction and improve daily ease.',
      roleOfPhysioHi: 'जोड़ों के आसपास की मांसपेशियों को मजबूत कर जोड़ों की गतिशीलता बढ़ाई जाती है।',
      commonSymptoms: ['Joint stiffness in morning', 'Crackling sounds or tenderness', 'Swelling after activity'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 5,
      image: '/images/physio_modalities_equipment_1793268959034.jpg'
    },
    {
      id: 'srv-6',
      categoryId: 'cat-joints-arthritis',
      name: 'Arthritis Rehabilitation',
      nameHi: 'गठिया (आर्थराइटिस) पुनर्वास',
      description: 'Specialized management for osteoarthritis and rheumatoid arthritis to maintain independence and joint flexibility.',
      descriptionHi: 'ऑस्टियोआर्थराइटिस और गठिया से पीड़ित मरीजों के लिए जोड़ों की सुरक्षा और गतिशीलता बनाए रखने का कार्यक्रम।',
      roleOfPhysio: 'Low-impact therapeutic movement, thermal modalities for morning stiffness, and energy conservation techniques to preserve joint cartilage.',
      roleOfPhysioHi: 'हल्के वैज्ञानिक व्यायाम और थेरेपी से जोड़ों का लचीलापन बनाए रखा जाता है ताकि मरीज बिना सहारे चल सके।',
      commonSymptoms: ['Chronic stiffness', 'Pain with weather changes or walking', 'Joint weakness'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 6
    },
    {
      id: 'srv-7',
      categoryId: 'cat-knee-rehab',
      name: 'Knee Replacement Rehabilitation',
      nameHi: 'नी रिप्लेसमेंट (घुटने के ऑपरेशन) के बाद फिजियोथेरेपी',
      description: 'Pre-operative prep and phased post-operative rehabilitation following Total Knee Replacement (TKR) or partial knee surgery.',
      descriptionHi: 'घुटने के ऑपरेशन (TKR) के बाद सुरक्षित रिकवरी, घुटना मोड़ने और बिना सहारे चलने का पूरा रिहैब।',
      roleOfPhysio: 'Regaining progressive knee bending (flexion), quadriceps activation, reduction of post-surgical swelling, and step-by-step gait re-training.',
      roleOfPhysioHi: 'सूजन कम करना, घुटना सीधा व पूरा मोड़ना, जांघ की मांसपेशियों को सक्रिय करना और सही चाल सिखाना।',
      commonSymptoms: ['Post-surgery stiffness', 'Difficulty bending knee past 90 degrees', 'Fear of weight bearing'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 7,
      image: '/images/clinic_treatment_room_1793268957681.jpg'
    },
    {
      id: 'srv-8',
      categoryId: 'cat-sports-injury',
      name: 'Sports Injury Physiotherapy',
      nameHi: 'खेलकूद और व्यायाम में लगी चोटों का इलाज',
      description: 'Active recovery protocols for muscle strains, joint sprains, running injuries, and gym-related physical trauma.',
      descriptionHi: 'दौड़ने, खेलने या जिम में मांसपेशियों में खिंचाव, मोच व चोटों की त्वरित व सुरक्षित रिकवरी।',
      roleOfPhysio: 'Cryotherapy, therapeutic ultrasound, soft-tissue mobilization, and functional sports drills to return athletes safely to activity.',
      roleOfPhysioHi: 'सूजन नियंत्रण, ऊतकों की हीलिंग और खेल के अनुरूप शक्ति व लचीलापन वापस लाना।',
      commonSymptoms: ['Sudden muscle tear sensation', 'Localized swelling and bruising', 'Inability to sprint or jump'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: false,
      isVisible: true,
      order: 8
    },
    {
      id: 'srv-9',
      categoryId: 'cat-sports-injury',
      name: 'Ligament Injury Rehabilitation',
      nameHi: 'लिगामेंट इंजरी (ACL, MCL, एंकल) रिहैब',
      description: 'Conservative recovery and post-arthroscopic rehabilitation for ACL, PCL, collateral ligament and ankle sprains.',
      descriptionHi: 'घुटने या टखने के लिगामेंट खिंचने या कटने के बाद घुटना मजबूत करने और संतुलन वापस पाने का इलाज।',
      roleOfPhysio: 'Proprioceptive and balance training, joint stability drills, and graduated resistance strengthening to prevent joint giving-way.',
      roleOfPhysioHi: 'संतुलन बोर्ड और रेजिस्टेंस बैंड व्यायामों द्वारा घुटने को स्थिरता प्रदान करना।',
      commonSymptoms: ['Knee giving way sensation', 'Pain upon twisting', 'Ankle instability'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: false,
      isVisible: true,
      order: 9
    },
    {
      id: 'srv-10',
      categoryId: 'cat-sports-injury',
      name: 'Tennis Elbow Physiotherapy',
      nameHi: 'टेनिस एल्बो (कोहनी दर्द) फिजियोथेरेपी',
      description: 'Targeted care for lateral epicondylitis affecting office workers, mechanics, cooks, and racket athletes.',
      descriptionHi: 'कोहनी के बाहरी हिस्से में दर्द, जिससे वजन उठाने, निचोड़ने या हाथ मिलाने में तकलीफ होती है।',
      roleOfPhysio: 'Deep friction massage, eccentric wrist extensor strengthening, and ultrasonic therapy to stimulate tendon remodeling.',
      roleOfPhysioHi: 'अल्ट्रासाउंड थेरेपी और कलाई के व्यायामों से कोहनी के टेंडन का दर्द जड़ से ठीक किया जाता है।',
      commonSymptoms: ['Sharp outer elbow tenderness', 'Weak grip strength', 'Pain lifting a glass or kettle'],
      durationMinutes: 35,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: false,
      isVisible: true,
      order: 10,
      image: '/images/physio_modalities_equipment_1793268959034.jpg'
    },
    {
      id: 'srv-11',
      categoryId: 'cat-shoulder-elbow',
      name: 'Frozen Shoulder Physiotherapy',
      nameHi: 'कंधे का जाम होना (फ्रोजन शोल्डर) का इलाज',
      description: 'Structured mobilization for adhesive capsulitis to safely restore arm reach and relieve night pain.',
      descriptionHi: 'कंधे की गति बंद होना, हाथ पीछे या ऊपर न उठना और रात में करवट लेने पर तेज दर्द होना।',
      roleOfPhysio: 'Glenohumeral joint mobilization, capsular stretching, shoulder wheel exercises, and pain-relieving modalities for smooth movement.',
      roleOfPhysioHi: 'कंधे के जोड़ की मोबिलाइजेशन, स्ट्रेचिंग और शोल्डर व्हील व्यायामों से जाम कंधा धीरे-धीरे खोला जाता है।',
      commonSymptoms: ['Inability to reach high shelves', 'Difficulty wearing shirt or combing hair', 'Deep aching night pain'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 11,
      image: '/images/clinic_treatment_room_1793268957681.jpg'
    },
    {
      id: 'srv-12',
      categoryId: 'cat-foot-heel',
      name: 'Heel Pain Physiotherapy',
      nameHi: 'एड़ी के दर्द (प्लांटर फेशिआइटिस) का इलाज',
      description: 'Treatment for plantar fasciitis, calcaneal spur tenderness, and severe morning first-step heel pain.',
      descriptionHi: 'सुबह सोकर उठने पर पैर जमीन पर रखते ही एड़ी में चुभन और तेज दर्द का फिजियोथेरेपी समाधान।',
      roleOfPhysio: 'Plantar fascia stretching, calf muscle release, contrast therapy guidance, and foot arch intrinsic muscle strengthening.',
      roleOfPhysioHi: 'प्लांटर फेशिया की स्ट्रेचिंग, पिंडलियों का खिंचाव और पैरों के तलवे की मांसपेशियों को मजबूत करने के व्यायाम।',
      commonSymptoms: ['Piercing heel pain during first morning steps', 'Aching after standing for hours', 'Heel tenderness on touch'],
      durationMinutes: 35,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: false,
      isVisible: true,
      order: 12
    },
    {
      id: 'srv-13',
      categoryId: 'cat-spine-disc',
      name: 'Disc Problem Physiotherapy',
      nameHi: 'स्लिप डिस्क एवं रीढ़ की हड्डी का उपचार',
      description: 'Non-surgical rehabilitation for herniated, bulging, or degenerated spinal discs in lumbar and thoracic spine.',
      descriptionHi: 'बिना सर्जरी के स्लिप डिस्क और दबी हुई नस का वैज्ञानिक एवं सुरक्षित फिजियोथेरेपी उपचार।',
      roleOfPhysio: 'McKenzie directional preference exercises, spinal decompression positions, and abdominal-lumbar bracing drills.',
      roleOfPhysioHi: 'मैकेंजी तकनीक और स्पाइनल डीकंप्रेशन द्वारा डिस्क को अपनी जगह पर लाने और नसों का दबाव हटाने का प्रयास।',
      commonSymptoms: ['Central low back pain worsening with bending', 'Numbness spreading to feet', 'Inability to sit for 15 minutes'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 13,
      image: '/images/physiotherapist_consultation_1793268957627.jpg'
    },
    {
      id: 'srv-14',
      categoryId: 'cat-neuro-rehab',
      name: 'Paralysis Rehabilitation',
      nameHi: 'पैरालिसिस (लकवा) फिजियोथेरेपी',
      description: 'Intensive functional neuro-rehabilitation for hemiplegia, paraplegia, and facial palsy (Bell’s Palsy).',
      descriptionHi: 'लकवे के कारण कमजोर या सुन्न हुए अंगों में गति व ताकत वापस लाने के लिए सघन फिजियोथेरेपी।',
      roleOfPhysio: 'Facilitation of voluntary movement, passive joint preservation, muscle tone normalization, and daily living skills retraining.',
      roleOfPhysioHi: 'हाथ-पैरों की मांसपेशियों को दोबारा सक्रिय करना, जोड़ों को अकड़ने से बचाना और मरीज को आत्मनिर्भर बनाना।',
      commonSymptoms: ['Muscle weakness on one side', 'Difficulty standing or gripping objects', 'Loss of functional coordination'],
      durationMinutes: 50,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 14,
      image: '/images/clinic_treatment_room_1793268957681.jpg'
    },
    {
      id: 'srv-15',
      categoryId: 'cat-neuro-rehab',
      name: 'Stroke Rehabilitation',
      nameHi: 'स्ट्रोक (ब्रेन अटैक) रिकवरी फिजियोथेरेपी',
      description: 'Phased recovery following ischemic or hemorrhagic stroke, focusing on limb recovery and balance.',
      descriptionHi: 'स्ट्रोक के बाद चाल-ढाल सुधारने, हाथ की पकड़ वापस लाने और सुरक्षित चलने का अभ्यास।',
      roleOfPhysio: 'Neuroplasticity stimulation, task-oriented gait training, balance perturbations, and caregiver education for safe home transfers.',
      roleOfPhysioHi: 'मस्तिष्क के न्यूरोप्लास्टिसिटी को प्रेरित करना, चाल सुधारना और घर पर देखभाल के सही तरीके सिखाना।',
      commonSymptoms: ['Loss of balance', 'Asymmetric walk pattern', 'Spasticity in arm or leg'],
      durationMinutes: 50,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 15
    },
    {
      id: 'srv-16',
      categoryId: 'cat-neuro-rehab',
      name: 'Cerebral Palsy Physiotherapy',
      nameHi: 'सेरेब्रल पाल्सी (CP) बाल फिजियोथेरेपी',
      description: 'Gentle, supportive developmental therapy for children with motor coordination challenges.',
      descriptionHi: 'विशेष बच्चों में बैठने, खड़े होने और चलने की क्षमता विकसित करने के लिए प्रेमपूर्ण फिजियोथेरेपी।',
      roleOfPhysio: 'Neurodevelopmental treatment (NDT), posture stabilization, preventing joint deformities, and encouraging motor milestone achievements.',
      roleOfPhysioHi: 'बच्चों में गर्दन संभालने, बैठने और संतुलन बनाने के लिए न्यूरो-डेवलपमेंटल तकनीकें।',
      commonSymptoms: ['Delayed developmental milestones', 'Muscle stiffness or floppiness', 'Abnormal gait'],
      durationMinutes: 45,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 16
    },
    {
      id: 'srv-17',
      categoryId: 'cat-balance-mobility',
      name: 'Balance and Mobility Training',
      nameHi: 'संतुलन एवं चाल सुधार प्रशिक्षण',
      description: 'Fall prevention, walking confidence enhancement, and mobility retraining especially for seniors.',
      descriptionHi: 'बुजुर्गों और चलने में लड़खड़ाने वाले मरीजों के लिए गिरकर चोट लगने से बचाने और संतुलन का प्रशिक्षण।',
      roleOfPhysio: 'Vestibular adaptation drills, tandem stance exercises, hurdle stepping, and proper walking cane/walker fitting.',
      roleOfPhysioHi: 'पैरों के पंजों और घुटनों की स्थिरता बढ़ाकर मरीज को बिना डर और सहारे के चलने में सक्षम बनाना।',
      commonSymptoms: ['Fear of falling', 'Unsteady swaying walk', 'Difficulty rising from a low chair'],
      durationMinutes: 40,
      priceNote: 'Consult clinic for session charges',
      homeVisitEligible: true,
      isVisible: true,
      order: 17
    },
    {
      id: 'srv-18',
      categoryId: 'cat-home-visits',
      name: 'Home Visit Physiotherapy',
      nameHi: 'घर पर फिजियोथेरेपी सेवा (होम विजिट)',
      description: 'Dedicated bedside physiotherapy service across Tatiri, Baghpat, and nearby village localities.',
      descriptionHi: 'जो मरीज क्लिनिक आने में असमर्थ हैं, उनके लिए उनके घर पर जाकर आधुनिक फिजियोथेरेपी सेवा।',
      roleOfPhysio: 'Portable electrotherapy equipment, bedside range of motion exercises, transfers, and family caregiver instruction in home comfort.',
      roleOfPhysioHi: 'पोर्टेबल मशीनों और व्यक्तिगत व्यायामों द्वारा मरीज के घर पर ही संपूर्ण देखभाल।',
      commonSymptoms: ['Bedridden status', 'Severe post-fracture or post-surgery pain', 'Elderly transport difficulty'],
      durationMinutes: 45,
      priceNote: 'Charges based on distance & condition; confirm with clinic',
      homeVisitEligible: true,
      isVisible: true,
      order: 18,
      image: '/images/physiotherapist_consultation_1793268957627.jpg'
    }
  ],
  gallery: [
    {
      id: 'gal-1',
      title: 'Consultation & Clinical Assessment',
      category: 'consultation',
      url: '/images/physiotherapist_consultation_1793268957627.jpg',
      alt: 'Dr. Harshit Jain explaining spinal alignment to patient in consultation room',
      caption: 'Detailed assessment, posture analysis, and personalized treatment planning with Dr. Harshit Jain (PT).',
      order: 1,
      isVisible: true
    },
    {
      id: 'gal-2',
      title: 'Treatment & Rehabilitation Hall',
      category: 'rehabilitation',
      url: '/images/clinic_treatment_room_1793268957681.jpg',
      alt: 'Clean physiotherapy exercise room with therapy bed and exercise gear',
      caption: 'Spacious, sanitary rehabilitation area equipped with therapy couches, resistance bands, and gym balls.',
      order: 2,
      isVisible: true
    },
    {
      id: 'gal-3',
      title: 'Electrotherapy & Pain Relief Modalities',
      category: 'equipment',
      url: '/images/physio_modalities_equipment_1793268959034.jpg',
      alt: 'Ultrasound therapy unit and digital IFT/TENS device',
      caption: 'Certified therapeutic modalities including Ultrasound and TENS/IFT for accelerated pain relief.',
      order: 3,
      isVisible: true
    },
    {
      id: 'gal-4',
      title: 'Orthocare Clinic Front',
      category: 'clinic_exterior',
      url: '/images/orthocare-clinic-front.png',
      alt: 'Street-front entrance and signboard of Orthocare Physiotherapy Clinic in Tatiri, Baghpat',
      caption: 'Orthocare Physiotherapy Clinic on Main Road, Aggarwal Mandi, Tatiri. Physiotherapy, rehabilitation, wellness and home visits.',
      order: 4,
      isVisible: true
    }
  ],
  faqs: [
    {
      id: 'faq-1',
      question: 'What problems can physiotherapy help with at Orthocare Clinic?',
      questionHi: 'ऑर्थोकेयर क्लिनिक में किन समस्याओं का इलाज होता है?',
      answer: 'Physiotherapy effectively addresses acute and chronic back pain, cervical/neck stiffness, sciatica, arthritis, knee pain, post-knee replacement recovery, frozen shoulder, sports injuries, tennis elbow, and neurological conditions like paralysis and stroke.',
      answerHi: 'क्लिनिक में कमर दर्द, सर्वाइकल, साइटिका, घुटनों का दर्द, गठिया, फ्रोजन शोल्डर, स्पोर्ट्स इंजरी और पैरालिसिस का प्रभावी फिजियोथेरेपी इलाज किया जाता है।',
      category: 'general',
      order: 1,
      isVisible: true
    },
    {
      id: 'faq-2',
      question: 'How can I book an appointment?',
      questionHi: 'अपॉइंटमेंट कैसे बुक करें?',
      answer: 'You can book directly by calling us at 8864849409, sending a WhatsApp message to +91 8864849409, or submitting the quick appointment form on this website. Our team will promptly confirm your timing.',
      answerHi: 'आप हमें 8864849409 पर सीधे कॉल कर सकते हैं, व्हाट्सएप संदेश भेज सकते हैं, या इस वेबसाइट पर फॉर्म भर सकते हैं।',
      category: 'booking',
      order: 2,
      isVisible: true
    },
    {
      id: 'faq-3',
      question: 'Is home-visit physiotherapy available in Baghpat & Tatiri?',
      questionHi: 'क्या बागपत और टटीरी में घर पर फिजियोथेरेपी (होम विजिट) उपलब्ध है?',
      answer: 'Yes! Dr. Harshit Jain provides home visit physiotherapy for elderly patients, bedridden individuals, or patients recovering from major surgery. Please call to confirm scheduling and location feasibility.',
      answerHi: 'हाँ! बुजुर्ग, बिस्तर पर पड़े या हाल ही में सर्जरी कराए मरीजों के लिए घर पर फिजियोथेरेपी उपलब्ध है। उपलब्धता जानने हेतु कॉल करें।',
      category: 'home-visit',
      order: 3,
      isVisible: true
    },
    {
      id: 'faq-4',
      question: 'Where is the clinic located in Baghpat?',
      questionHi: 'क्लिनिक कहाँ स्थित है?',
      answer: 'Orthocare Physiotherapy Clinic is conveniently located on Main Road, Aggarwal Mandi, Tatiri, Baghpat, Uttar Pradesh – 250609. Landmark: Near Aggarwal Mandi Market.',
      answerHi: 'क्लिनिक मेन रोड, अग्रवाल मंडी, टटीरी, बागपत (उत्तर प्रदेश - 250609) में स्थित है।',
      category: 'location',
      order: 4,
      isVisible: true
    },
    {
      id: 'faq-5',
      question: 'What are the consultation fees?',
      questionHi: 'परामर्श एवं थेरेपी शुल्क क्या है?',
      answer: 'Consultation and session fees depend on the specific condition, required modalities, and duration. Our clinic maintains honest, affordable rates for the local community. Please contact us directly at 8864849409 for exact fee details.',
      answerHi: 'शुल्क समस्या की गंभीरता और आवश्यक थेरेपी पर निर्भर करता है। सही जानकारी के लिए कृपया क्लिनिक फोन नंबर 8864849409 पर संपर्क करें।',
      category: 'fees',
      order: 5,
      isVisible: true
    },
    {
      id: 'faq-6',
      question: 'Do I need a doctor’s referral to consult Dr. Harshit Jain?',
      questionHi: 'क्या फिजियोथेरेपी शुरू करने के लिए किसी अन्य डॉक्टर की पर्ची जरूरी है?',
      answer: 'No referral is mandatory. You can come directly for clinical assessment. However, if you already have X-rays, MRI scans, or hospital discharge summaries, please bring them along to your first appointment.',
      answerHi: 'कोई रेफरल अनिवार्य नहीं है। यदि आपके पास एक्स-रे, एमआरआई या पिछली रिपोर्ट हैं, तो उन्हें पहली विजिट पर साथ जरूर लाएं।',
      category: 'general',
      order: 6,
      isVisible: true
    }
  ],
  enquiries: []
};
