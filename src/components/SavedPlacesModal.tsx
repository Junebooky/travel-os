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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end max-w-md mx-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border-t border-slate-700/80 rounded-t-3xl p-5 max-h-[85vh] flex flex-col space-y-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t('saved.title')} ({savedPlaces.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {savedPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAllOpen(true)}
                className="min-h-[44px] text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-900/60 hover:bg-rose-950/40 transition-colors flex items-center justify-center"
              >
                {t('saved.delete_all.action')}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
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
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Bookmark className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">
                  {t('saved.empty.title')}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {t('saved.empty.body')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  returnToMapWithPlace(null);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t('saved.empty.cta')}</span>
              </button>
            </div>
          ) : (
            savedPlaces.map((place) => (
              <div
                key={place.id}
                className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/70 space-y-2.5 hover:border-slate-600 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider block mb-0.5">
                      {place.categoryName || place.category}
                    </span>
                    <h4 className="text-sm font-bold text-white truncate">{place.name}</h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{place.address}</p>
                  </div>
                  <button
                    onClick={() => removePlace(place.id)}
                    className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                    title={t('saved.action.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60">
                  <button
                    onClick={() => handleOpenOnMap(place)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t('saved.action.open')}</span>
                  </button>
                  <button
                    onClick={() => handleDirections(place)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all"
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
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {t('saved.delete_all.title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('saved.delete_all.body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors"
              >
                {t('saved.delete_all.cancel')}
              </button>
              <button
                onClick={() => {
                  clearAllSavedPlaces();
                  setIsConfirmDeleteAllOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors"
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
