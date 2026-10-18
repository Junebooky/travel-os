'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { useTravel } from '@/context/TravelContext';
import { COUNTRIES, SUPPORTED_LANGUAGES } from '@/data/countries';
import { t } from '@/lib/i18n';
import SavedPlacesModal from './SavedPlacesModal';
import CountryPickerModal from './CountryPickerModal';
import {
  Globe,
  Bookmark,
  Trash2,
  Info,
  AlertTriangle,
  RotateCcw,
  Check,
  ChevronRight,
  Smartphone,
  Download,
} from 'lucide-react';

function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

function subscribePwaReady(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('travel_os_pwa_ready', callback);
  return () => window.removeEventListener('travel_os_pwa_ready', callback);
}

function getCanInstallSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__travel_os_deferred_prompt);
}

function getIsIOSSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
}

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
  const [installPromptDismissed, setInstallPromptDismissed] = useState<boolean>(false);

  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);
  const canInstallPrompt = useSyncExternalStore(subscribePwaReady, getCanInstallSnapshot, () => false);
  const isIOS = useSyncExternalStore(() => () => {}, getIsIOSSnapshot, () => false);

  const canInstall = canInstallPrompt && !installPromptDismissed;

  const handleInstallClick = async () => {
    if (window.__travel_os_deferred_prompt) {
      const promptEvent = window.__travel_os_deferred_prompt;
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        showToast('앱 설치가 완료되었습니다', 'success');
      }
      window.__travel_os_deferred_prompt = null;
      setInstallPromptDismissed(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#191F28] pb-24 flex flex-col max-w-md mx-auto p-4 space-y-4">
      {/* Settings Title */}
      <div className="pt-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#191F28] mb-1">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-[#8B95A1] font-medium">
          내 여행과 저장 데이터를 관리하세요
        </p>
      </div>

      {/* Travel Settings Section */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="text-xs font-bold text-[#8B95A1] flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-[#1B64DA]" />
          <span>{t('settings.travel.section')}</span>
        </div>

        {/* Current Destination Country */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{country.flag}</span>
            <div>
              <div className="font-bold text-sm text-[#191F28]">
                {country.name} ({country.code})
              </div>
              <div className="text-xs text-[#8B95A1]">
                {t('settings.travel.country')}
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsCountryPickerOpen(true)}
            className="text-xs font-bold text-[#1B64DA] hover:text-[#1652B5] bg-[#FFFFFF] hover:bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E5E8EB] transition-all active:scale-95 shadow-sm"
          >
            {t('settings.travel.change')}
          </button>
        </div>

        {/* Current Language & Currency Quick Badges */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] space-y-1">
            <span className="text-[#8B95A1] block font-medium">{t('settings.travel.language')}</span>
            <span className="font-bold text-[#191F28]">
              {SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] space-y-1">
            <span className="text-[#8B95A1] block font-medium">{t('settings.travel.currency')}</span>
            <span className="font-bold text-[#191F28]">
              {localCurrency} ({country.currencySymbol})
            </span>
          </div>
        </div>
      </div>

      {/* Saved Places (P1) Entry */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm">
        <button
          onClick={() => setIsSavedModalOpen(true)}
          className="w-full flex items-center justify-between group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center text-[#1B64DA]">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-[#191F28] flex items-center gap-2">
                {t('saved.title')}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFFFF] text-[#4E5968] border border-[#E5E8EB]">
                  {savedPlaces.length}개
                </span>
              </div>
              <div className="text-xs text-[#8B95A1] mt-0.5">
                지도에서 저장한 장소 모아보기
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8B95A1] group-hover:text-[#191F28] transition-colors" />
        </button>
      </div>

      {/* PWA Home Screen Installation Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-[#8B95A1] flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-[#1B64DA]" />
            <span>{t('pwa.install.title')}</span>
          </div>
          {isStandalone && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFFFF] text-[#191F28] border border-[#E5E8EB] flex items-center gap-1">
              <Check className="w-3 h-3 text-[#1B64DA]" />
              <span>설치됨</span>
            </span>
          )}
        </div>

        <p className="text-xs text-[#4E5968] leading-relaxed">
          {isStandalone
            ? '현재 홈 화면 설치 모드로 실행 중입니다.'
            : isIOS
            ? 'iOS Safari 하단의 [공유] 버튼을 누른 후 "홈 화면에 추가"를 탭하면 앱으로 바로 사용할 수 있어요.'
            : t('pwa.install.body')}
        </p>

        {!isStandalone && canInstall && (
          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-3 rounded-xl bg-[#1B64DA] hover:bg-[#1652B5] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('pwa.install.action')}</span>
          </button>
        )}

        {!isStandalone && !canInstall && !isIOS && (
          <div className="text-[11px] text-[#8B95A1]">
            {t('pwa.install.unavailable')}
          </div>
        )}
      </div>

      {/* Device Storage Management Section */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-3">
        <div className="text-xs font-bold text-[#8B95A1] flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5 text-[#4E5968]" />
          <span>{t('settings.storage.title')}</span>
        </div>

        <p className="text-xs text-[#4E5968] leading-relaxed">
          이 기기에 저장된 여행지 설정, 검색 기록, 저장한 장소 데이터를 초기화합니다.
        </p>

        <button
          onClick={() => setIsConfirmResetOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] text-rose-600 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('settings.storage.clear_action')}</span>
        </button>
      </div>

      {/* About & Policies */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 space-y-2.5 text-xs text-[#4E5968] shadow-sm">
        <div className="flex items-center justify-between text-[#191F28] font-bold">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#1B64DA]" />
            <span>Travel OS</span>
          </span>
          <span className="text-[11px] text-[#8B95A1]">
            {t('settings.about.version', { version: '1.0.0' })}
          </span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#8B95A1]">
          비회원 모바일 우선 PWA. 개인 식별 정보를 수집하지 않으며 여행지 설정은 기기 로컬에 보관됩니다. 단, 실시간 번역 요청 시 입력 텍스트가 번역 AI(Google Gemini API)로, 지도 검색 시 검색어와 좌표가 지도 서비스(Google Places / OpenStreetMap)로 전송되어 처리됩니다.
        </p>
      </div>

      {/* Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
      />

      {/* Country Picker Modal */}
      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        countries={COUNTRIES}
        selectedCode={country.code}
        onSelect={(nextCountry) => {
          setCountry(nextCountry);
          setIsCountryPickerOpen(false);
          showToast(`${nextCountry.name}(으)로 여행 설정을 변경했어요`, 'success');
        }}
        onClose={() => setIsCountryPickerOpen(false)}
      />

      {/* Storage Reset Confirmation Modal */}
      {isConfirmResetOpen && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-5 max-w-xs w-full space-y-3 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#191F28]">
              {t('settings.storage.clear_title')}
            </h3>
            <p className="text-xs text-[#4E5968] leading-relaxed">
              {t('settings.storage.clear_body')}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setIsConfirmResetOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FFFFFF] text-[#4E5968] font-bold text-xs hover:bg-[#F8FAFC] transition-colors border border-[#E5E8EB]"
              >
                {t('common.action.cancel')}
              </button>
              <button
                onClick={() => {
                  resetAllData();
                  setIsConfirmResetOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition-colors shadow-xs"
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
