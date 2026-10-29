import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { HelpCircle, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';

export function FaqPage() {
  const { faqs, settings, getWhatsappUrl, language } = useClinic();
  const [openIds, setOpenIds] = useState<string[]>(['faq-1', 'faq-2']);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const visibleFaqs = faqs.filter((f) => f.isVisible);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Title */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1 rounded-md">
          <HelpCircle className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'सामान्य प्रश्नोत्तर' : 'Patient Assistance'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'hi'
            ? 'अक्सर पूछे जाने वाले सवाल (FAQs)'
            : 'Frequently Asked Questions'}
        </h1>
        <p className="text-base text-slate-600 max-w-xl mx-auto">
          {language === 'hi'
            ? 'फिजियोथेरेपी, क्लिनिक समय, होम विजिट और अपॉइंटमेंट के बारे में सामान्य सवालों के जवाब।'
            : 'Clear, transparent answers about our clinical treatments, home visits in Baghpat, and appointment procedures.'}
        </p>
      </div>

      {/* Accordions */}
      <div className="space-y-3">
        {visibleFaqs.map((faq) => {
          const isOpen = openIds.includes(faq.id);
          const questionText = language === 'hi' && faq.questionHi ? faq.questionHi : faq.question;
          const answerText = language === 'hi' && faq.answerHi ? faq.answerHi : faq.answer;

          return (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-colors"
            >
              <button
                onClick={() => toggleOpen(faq.id)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-blue-900 cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="text-base sm:text-lg leading-snug">{questionText}</span>
                <span className="p-1 rounded-lg bg-slate-100 text-slate-500 shrink-0">
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                  {answerText}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Direct Contact Prompt if question not answered */}
      <div className="p-8 rounded-3xl bg-slate-100 border border-slate-200 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {language === 'hi' ? 'क्या आपका कोई अन्य प्रश्न है?' : 'Have a Specific Medical Question?'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Feel free to call Dr. Harshit Jain or chat on WhatsApp for personalized clarification about your pain symptoms or treatment requirements.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <a
            href={`tel:${settings?.phone || '8864849409'}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors tabular-nums"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call: {settings?.phone || '8864849409'}</span>
          </a>

          <a
            href={getWhatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            <span>Ask on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
