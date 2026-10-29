import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { TreatmentService } from '../types';
import { X, Clock, Home, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

interface Props {
  service: TreatmentService | null;
  onClose: () => void;
}

export function ServiceDetailModal({ service, onClose }: Props) {
  const { openAppointmentModal, getWhatsappUrl, language, categories } = useClinic();

  if (!service) return null;

  const category = categories.find((c) => c.id === service.categoryId);

  const handleBookClick = () => {
    onClose();
    openAppointmentModal(service.name);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] sm:max-h-[85vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400 block">
              {category?.name || 'Physiotherapy Care'}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white mt-0.5 font-heading">
              {service.name}
            </h3>
            {service.nameHi && (
              <p className="text-xs sm:text-sm text-slate-300 font-medium">{service.nameHi}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 pb-safe">
          {/* Optional service image */}
          {service.image && (
            <div className="w-full h-44 sm:h-56 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={service.image}
                alt={service.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Key metadata strip */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Clock className="w-4 h-4 text-blue-900" />
              <span>Session Duration: ~{service.durationMinutes} mins</span>
            </div>
            <span aria-hidden="true">·</span>
            {service.homeVisitEligible ? (
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <Home className="w-4 h-4 text-emerald-700" />
                <span>Home Visit Available in Tatiri/Baghpat</span>
              </div>
            ) : (
              <div className="text-slate-500 font-medium">
                <span>Clinic-based Modality Treatment</span>
              </div>
            )}
            {service.priceNote && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-600 font-medium">{service.priceNote}</span>
              </>
            )}
          </div>

          {/* The Problem Addressed */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
              {language === 'hi' ? 'समस्या एवं लक्षण' : 'Problem Addressed'}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              {language === 'hi' && service.descriptionHi ? service.descriptionHi : service.description}
            </p>
          </div>

          {/* Role of Physiotherapy */}
          {service.roleOfPhysio && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 sm:p-5">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-900" />
                <span>{language === 'hi' ? 'फिजियोथेरेपी की भूमिका' : 'Role of Physiotherapy'}</span>
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed">
                {language === 'hi' && service.roleOfPhysioHi ? service.roleOfPhysioHi : service.roleOfPhysio}
              </p>
            </div>
          )}

          {/* Symptoms Covered */}
          {service.commonSymptoms && service.commonSymptoms.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Common Signs & Indications:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {service.commonSymptoms.map((symp, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{symp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Honest Medical Transparency Note */}
          <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
            Note: Recovery time depends on individual diagnosis, chronicity, and consistent adherence to clinical exercises. Our clinic never promises exaggerated or overnight cures.
          </p>

          {/* Action Buttons (Full width on mobile) */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleBookClick}
              className="h-12 inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer active:scale-98"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{language === 'hi' ? 'अपॉइंटमेंट बुक करें' : 'Book Appointment for this Care'}</span>
            </button>

            <a
              href={getWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors text-center active:scale-98"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>{language === 'hi' ? 'व्हाट्सएप पर पूछें' : 'WhatsApp Consultation'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
