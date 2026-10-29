import React from 'react';
import { useClinic } from '../context/ClinicContext';
import { Phone } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';

export function MobileQuickBar() {
  const { settings, getWhatsappUrl, language } = useClinic();

  return (
    <aside
      aria-label="Quick contact actions"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200/90 px-3 pt-2.5 pb-safe backdrop-blur-md shadow-2xl"
    >
      <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
        {/* Direct Call Button */}
        <a
          href={`tel:${settings?.phone || '8864849409'}`}
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-slate-900 active:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-98 transition-all whitespace-nowrap"
        >
          <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0">
            <Phone className="w-3.5 h-3.5" />
          </div>
          <span>{language === 'hi' ? 'कॉल करें' : 'Call'}</span>
        </a>

        {/* Direct WhatsApp Button */}
        <a
          href={getWhatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 h-12 px-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm active:scale-98 transition-all whitespace-nowrap"
        >
          <div className="w-6 h-6 rounded-lg bg-emerald-700/80 flex items-center justify-center text-white shrink-0">
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </div>
          <span>{language === 'hi' ? 'व्हाट्सएप चैट' : 'WhatsApp'}</span>
        </a>
      </div>
    </aside>
  );
}
