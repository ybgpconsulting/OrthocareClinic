import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { ShieldCheck, Award, HeartHandshake, CheckCircle2, MapPin, Phone, Calendar } from 'lucide-react';

export function AboutPage() {
  const { settings, content, openAppointmentModal, getWhatsappUrl, language } = useClinic();

  const consultationImage = '/images/physiotherapist_consultation_1793268957627.jpg';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      
      {/* Intro Header */}
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
          <Award className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'क्लिनिक एवं डॉक्टर परिचय' : 'About Orthocare & Dr. Harshit Jain'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'hi'
            ? 'ऑर्थोकेयर फिजियोथेरेपी क्लिनिक, बागपत'
            : 'Dedicated Physiotherapy & Pain Management in Baghpat'}
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          {language === 'hi'
            ? 'अग्रवाल मंडी टटीरी, बागपत में स्थित ऑर्थोकेयर फिजियोथेरेपी क्लिनिक जोड़ों के दर्द, रीढ़ की हड्डी की समस्याओं और न्यूरोलॉजिकल पुनर्वास के लिए एक आधुनिक स्वास्थ्य केंद्र है।'
            : 'Established to deliver certified, modern physiotherapy and rehabilitation to patients across Baghpat, Aggarwal Mandi Tatiri, and surrounding rural communities.'}
        </p>
      </div>

      {/* Doctor Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xs">
        <div className="lg:col-span-5">
          <div className="rounded-2xl overflow-hidden aspect-4/3 bg-slate-100 border border-slate-200 shadow-sm">
            <img
              src={consultationImage}
              alt="Dr. Harshit Jain (PT) evaluating posture and spine health in clinic"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="inline-block px-3 py-1 rounded-md bg-blue-50 text-blue-900 text-xs font-bold uppercase tracking-wider">
            Lead Physiotherapist & Consultant
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {settings?.doctorName || 'Dr. Harshit Jain (PT)'}
          </h2>
          <p className="text-sm font-semibold text-blue-900">
            {settings?.doctorQualifications || 'BPT, COMT, MIAP, CNDS (Delhi)'}
          </p>

          <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
            {language === 'hi' && content?.aboutDoctorBioHi ? content.aboutDoctorBioHi : content?.aboutDoctorBio}
          </p>

          {/* Qualifications Breakdown */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">BPT</span>
              <span className="text-slate-500">Bachelor of Physiotherapy</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">COMT</span>
              <span className="text-slate-500">Certified Orthopedic Manual Therapy</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">MIAP</span>
              <span className="text-slate-500">Member, Indian Association of Physiotherapists</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">CNDS (Delhi)</span>
              <span className="text-slate-500">Certified Neuro-Developmental Specialist</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinic Principles & Facility */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="text-lg font-bold text-slate-900">Evidence-Based Treatment</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every patient undergoes a thorough clinical evaluation of posture, range of motion, and nerve mobility before treatment begins. We explain the root cause and the logic behind each therapeutic exercise.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="text-lg font-bold text-slate-900">Modern Therapy Equipment</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our treatment rooms are equipped with therapeutic Ultrasound machines, digital TENS/IFT electrotherapy devices, hot/cold therapy systems, and exercise rehabilitation gear to manage acute pain safely.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="text-lg font-bold text-slate-900">Patient Comfort & Home Care</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            We provide bedside home visit physiotherapy for bedridden patients, elderly individuals, or post-surgery recoveries in Tatiri and nearby villages, ensuring quality medical rehabilitation reaches everyone.
          </p>
        </div>
      </div>

      {/* Location and appointment strip */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold">Consult with Dr. Harshit Jain (PT)</h3>
          <p className="text-xs sm:text-sm text-slate-400">
            Main Road, Aggarwal Mandi, Tatiri, Baghpat, Uttar Pradesh – 250609
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => openAppointmentModal()}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Book Appointment
          </button>
          <a
            href={`tel:${settings?.phone || '8864849409'}`}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors tabular-nums"
          >
            Call: {settings?.phone || '8864849409'}
          </a>
        </div>
      </div>
    </div>
  );
}
