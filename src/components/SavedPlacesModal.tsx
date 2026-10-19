'use client';

import React, { useState } from 'react';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';
import { Place } from '@/types/travel';
import {
  X,
  Bookmark,
  Trash2,
  ExternalLink,
  MapPin,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export default function SavedPlacesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    savedPlaces,
    removePlace,
    clearAllSavedPlaces,
    returnToMapWithPlace,
  } = useTravel();

  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleOpenOnMap = (place: Place) => {
    returnToMapWithPlace(place);
    onClose();
  };

  const handleDirections = (place: Place) => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border-t border-[#E5E8EB] rounded-t-3xl p-5 max-h-[85vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-[#087F8C]" />
            <h2 className="text-lg font-bold text-[#191F28] tracking-tight">
              {t('saved.title')} ({savedPlaces.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {savedPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(true)}
                className="min-h-[44px] text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors flex items-center justify-center font-medium"
              >
                {t('saved.delete_all.action')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#8B95A1] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors"
              aria-label={t('common.action.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list or empty state */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 -mr-1">
          {savedPlaces.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center mx-auto text-[#8B95A1] shadow-xs">
                <Bookmark className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#191F28]">
                  {t('saved.empty.title')}
                </h3>
                <p className="text-xs text-[#4E5968] mt-1 max-w-xs mx-auto">
                  {t('saved.empty.body')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  returnToMapWithPlace(null);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#087F8C] hover:bg-[#066B77] text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t('saved.empty.cta')}</span>
              </button>
            </div>
          ) : (
            savedPlaces.map((place) => (
              <div
                key={place.id}
                className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] space-y-2.5 hover:border-[#8B95A1]/40 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-[#087F8C] uppercase tracking-wider block mb-0.5">
                      {place.categoryName || place.category}
                    </span>
                    <h4 className="text-sm font-bold text-[#191F28] truncate">{place.name}</h4>
                    <p className="text-xs text-[#4E5968] truncate mt-0.5">{place.address}</p>
                  </div>
                  <button
                    onClick={() => removePlace(place.id)}
                    className="text-[#8B95A1] hover:text-rose-600 p-1 transition-colors"
                    title={t('saved.action.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#E5E8EB]">
                  <button
                    onClick={() => handleOpenOnMap(place)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#087F8C] hover:bg-[#066B77] text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t('saved.action.open')}</span>
                  </button>
                  <button
                    onClick={() => handleDirections(place)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#191F28] text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all border border-[#E5E8EB]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('saved.action.directions')}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirm Delete All Dialog */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#191F28]">
              {t('saved.delete_all.title')}
            </h3>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              {t('saved.delete_all.body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#FFFFFF] text-[#4E5968] font-medium text-xs hover:bg-[#F8FAFC] transition-colors border border-[#E5E8EB]"
              >
                {t('saved.delete_all.cancel')}
              </button>
              <button
                onClick={() => {
                  clearAllSavedPlaces();
                  setIsConfirmDeleteAllOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors shadow-sm"
              >
                {t('saved.delete_all.action')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
