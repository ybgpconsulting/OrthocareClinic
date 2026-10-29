import React, { useState } from 'react';
import { useClinic } from '../context/ClinicContext';
import { GalleryItem } from '../types';
import { Camera, X, ZoomIn, Activity, Info } from 'lucide-react';
import { ResponsiveImage } from '../components/ResponsiveImage';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useRef } from 'react';

export function GalleryPage() {
  const { gallery, language } = useClinic();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(Boolean(activeItem), dialogRef, () => setActiveItem(null));

  const visibleGallery = gallery.filter((g) => g.isVisible);
  const filteredGallery =
    selectedCategory === 'all'
      ? visibleGallery
      : visibleGallery.filter((g) => g.category === selectedCategory);

  const categories = [
    { id: 'all', label: language === 'hi' ? 'सभी तस्वीरें' : 'All Photos' },
    { id: 'rehabilitation', label: language === 'hi' ? 'पुनर्वास कक्ष' : 'Treatment & Rehab Room' },
    { id: 'consultation', label: language === 'hi' ? 'परामर्श कक्ष' : 'Consultation' },
    { id: 'equipment', label: language === 'hi' ? 'उपकरण एवं मशीनें' : 'Electrotherapy Equipment' },
    { id: 'clinic_exterior', label: language === 'hi' ? 'क्लिनिक परिसर' : 'Clinic Facility' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Page Title */}
      <div className="max-w-3xl space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
          <Camera className="w-4 h-4 text-amber-700" />
          <span>{language === 'hi' ? 'क्लिनिक की वास्तविक झलक' : 'Visual Facility Tour'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {language === 'hi'
            ? 'ऑर्थोकेयर क्लिनिक फोटो गैलरी'
            : 'Orthocare Clinic Photo Gallery'}
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          {language === 'hi'
            ? 'अग्रवाल मंडी टटीरी में स्थित हमारे क्लिनिक के उपचार कक्ष, आधुनिक इलेक्ट्रोथेरेपी उपकरण और परामर्श कक्ष की वास्तविक तस्वीरें।'
            : 'Explore genuine photographs of our consultation area, rehabilitation hall, and certified electrotherapy modalities in Tatiri, Baghpat.'}
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGallery.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setActiveItem(item)}
            aria-label={`View ${item.title}`}
            className="group w-full text-left bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
              <ResponsiveImage
                src={item.url}
                alt={item.alt || item.title}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <div className="p-2.5 rounded-full bg-slate-900/70 backdrop-blur-xs">
                  <ZoomIn aria-hidden="true" className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-1">
              <span className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider block">
                {item.category.replace('_', ' ')}
              </span>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                {item.title}
              </h3>
              {item.caption && (
                <p className="text-xs text-slate-500 line-clamp-2">
                  {item.caption}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Privacy compliance note */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-slate-100 text-xs text-slate-500">
        <Info className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
        <p>
          Patient privacy notice: Photographs shown represent the clinic's treatment infrastructure, modalities, and clinical setting. No identifiable patient photographs are displayed without prior explicit consent.
        </p>
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveItem(null)}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="gallery-dialog-title"
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
              <div>
                <h3 id="gallery-dialog-title" className="text-base font-bold">{activeItem.title}</h3>
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  {activeItem.category.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => setActiveItem(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                aria-label="Close photo preview"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[70vh] bg-black flex items-center justify-center overflow-hidden">
              <ResponsiveImage
                src={activeItem.url}
                alt={activeItem.alt || activeItem.title}
                sizes="(min-width: 1024px) 80vw, 100vw"
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>

            {activeItem.caption && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs sm:text-sm text-slate-300">
                {activeItem.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
