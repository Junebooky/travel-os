'use client';

import React, { useState } from 'react';
import { useTravel } from '@/context/TravelContext';
import { COUNTRIES, SUPPORTED_LANGUAGES } from '@/data/countries';
import { t } from '@/lib/i18n';
import SavedPlacesModal from './SavedPlacesModal';
import {
  Globe,
  Bookmark,
  Trash2,
  Info,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronRight,
} from 'lucide-react';

export default function SettingsView() {
  const {
    country,
    setCountry,
    targetLang,
    localCurrency,
    savedPlaces,
    resetAllData,
    showToast,
  } = useTravel();

  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState<boolean>(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 flex flex-col max-w-md mx-auto p-4 space-y-4">
      {/* Settings Title */}
      <div className="pt-2">
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-400">
          여행 국가, 언어, 통화 및 기기 저장 데이터를 관리할 수 있어요.
        </p>
      </div>

      {/* Travel Settings Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('settings.travel.section')}</span>
        </div>

        {/* Current Destination Country */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{country.flag}</span>
            <div>
              <div className="font-semibold text-sm text-slate-100">
                {country.name} ({country.code})
              </div>
              <div className="text-xs text-slate-400">
                {t('settings.travel.country')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCountryPickerOpen(true)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/60 hover:bg-blue-900/80 px-2.5 py-1.5 rounded-lg border border-blue-800/60 transition-all active:scale-95"
          >
            {t('settings.travel.change')}
          </button>
        </div>

        {/* Current Language & Currency Quick Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">{t('settings.travel.language')}</span>
            <span className="font-bold text-slate-200">
              {SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <span className="text-slate-400 block">{t('settings.travel.currency')}</span>
            <span className="font-bold text-amber-400">
              {localCurrency} ({country.currencySymbol})
            </span>
          </div>
        </div>
      </div>

      {/* Saved Places (P1) Entry */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <button
          onClick={() => setIsSavedModalOpen(true)}
          className="w-full flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                {t('saved.title')}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  {savedPlaces.length}개
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                지도에서 저장한 장소 모아보기
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
        </button>
      </div>

      {/* Device Storage Management Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{t('settings.storage.title')}</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          이 기기에 저장된 여행지 설정, 검색 기록, 저장한 장소 데이터를 초기화합니다.
        </p>

        <button
          onClick={() => setIsConfirmResetOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('settings.storage.clear_action')}</span>
        </button>
      </div>

      {/* About & Policies */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 text-xs text-slate-400">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>Travel OS</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {t('settings.about.version', { version: '1.0.0' })}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          비회원 모바일 우선 PWA. 개인 식별 정보를 수집하지 않으며 여행지 설정은 기기 로컬에 보관됩니다. 단, 실시간 번역 요청 시 입력 텍스트가 번역 AI(Google Gemini API)로, 지도 검색 시 검색어와 좌표가 지도 서비스(Google Places / OpenStreetMap)로 전송되어 처리됩니다.
        </p>
      </div>

      {/* Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
      />

      {/* Country Picker Modal */}
      {isCountryPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col">
            <h3 className="text-base font-bold text-white">
              {t('onboarding.country.title')}
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountry(c);
                    setIsCountryPickerOpen(false);
                    showToast(`${c.name}(으)로 여행 설정을 변경했어요`, 'success');
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-all ${
                    country.code === c.code
                      ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                      : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{c.flag}</span>
                    <span className="font-semibold text-slate-100">{c.name}</span>
                  </div>
                  {country.code === c.code && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsCountryPickerOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              {t('common.action.close')}
            </button>
          </div>
        </div>
      )}

      {/* Storage Reset Confirmation Modal */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">
              {t('settings.storage.clear_title')}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('settings.storage.clear_body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmResetOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700 transition-colors"
              >
                {t('common.action.cancel')}
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setIsConfirmResetOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-500 transition-colors"
              >
                {t('settings.storage.clear_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
