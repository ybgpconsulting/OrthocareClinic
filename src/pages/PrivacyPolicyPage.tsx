import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { Shield } from 'lucide-react';

export function PrivacyPolicyPage() {
  const { settings } = useClinic();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Title */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Patient Data Privacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-slate-500">
          Last updated: October 2026 · Orthocare Physiotherapy Clinic (Aggarwal Mandi, Tatiri, Baghpat)
        </p>
      </div>

      {/* Policy Card */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xs space-y-8 text-sm text-slate-700 leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">1. Overview & Purpose</h2>
          <p>
            Orthocare Physiotherapy Clinic respects your privacy. Appointment details entered on this website are used in your browser to prepare a WhatsApp message. The website does not submit or store those details.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
          <p>
            If you choose to prepare an appointment message, the details below are placed into a WhatsApp message. Nothing is sent to the clinic until you review and send that message in WhatsApp.
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
            <li>Patient Name</li>
            <li>Contact Phone Number (Mobile)</li>
            <li>Requested Physiotherapy Treatment / Medical Concern</li>
            <li>Preferred Consultation Date and Time</li>
            <li>Home Visit preference (if applicable)</li>
            <li>Optional message describing current physical symptoms</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">3. How Your Information Is Used</h2>
          <p>
            Details entered in the appointment form are used only in your browser to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
            <li>Prepare an appointment enquiry message for you to review and send to the clinic via WhatsApp.</li>
          </ul>
          <p className="font-semibold text-slate-800">
            WhatsApp is operated by Meta. If you send the message, WhatsApp and the clinic will receive its contents under their applicable privacy practices. Do not include sensitive medical information you do not wish to share.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">4. Third-Party Integrations</h2>
          <p>
            Our website provides direct links to WhatsApp (operated by Meta) and Google Maps for directions. When you use those external services, your interactions are governed by their respective privacy terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">5. Contact Regarding Your Data</h2>
          <p>
            To discuss information you sent to the clinic through WhatsApp, contact the clinic owner directly:
          </p>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p className="font-bold text-slate-900">{settings?.clinicName || 'Orthocare Physiotherapy Clinic'}</p>
            <p>Dr. Harshit Jain (PT)</p>
            <p>Address: {settings?.address || 'Main Road, Aggarwal Mandi, Tatiri, Baghpat – 250609'}</p>
            <p>Phone: {settings?.phone || '8864849409'}</p>
            {settings?.email && <p>Email: {settings.email}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
