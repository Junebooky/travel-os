'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { useTravel } from '@/context/TravelContext';
import { COUNTRIES, SUPPORTED_LANGUAGES } from '@/data/countries';
import { t } from '@/lib/i18n';
import SavedPlacesModal from './SavedPlacesModal';
import CountryPickerModal from './CountryPickerModal';
import CountryFlagSphere from './CountryFlagSphere';
import {
  Settings,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  Download,
  Check,
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
  const handler = () => callback();
  window.addEventListener('beforeinstallprompt', handler);
  window.addEventListener('appinstalled', handler);
  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
    window.removeEventListener('appinstalled', handler);
  };
}

function getCanInstallSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__travel_os_deferred_prompt);
}

function getIsIOSSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
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

  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);

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
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-3xl font-black tracking-tight text-[#191F28] mb-1">
          {t('settings.title')}
        </h1>
        <p className="text-sm font-semibold text-[#6B7684]">
          내 여행과 저장 데이터를 관리하세요
        </p>
      </div>

      {/* 1. Travel Hero Card (16:9 1920x1080 background) */}
      <div className="w-full aspect-[16/9] relative rounded-[24px] overflow-hidden border border-[#E5E8EB] shadow-md select-none">
        <Image
          src="/assets/setting_tab/travel_setting.png"
          alt="Travel Setting Scene"
          fill
          className="object-cover pointer-events-none"
          priority
        />

        {/* Top-Right Floating White Pill CTA: ⚙ 여행 정보 수정 › */}
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-10">
          <button
            type="button"
            onClick={() => setIsCountryPickerOpen(true)}
            className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#1B64DA] font-bold text-xs sm:text-sm border border-[#E5E8EB] shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            aria-label={t('settings.country_picker.modify')}
          >
            <Settings className="w-3.5 h-3.5 text-[#1B64DA]" />
            <span>{t('settings.country_picker.modify')}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#1B64DA]" />
          </button>
        </div>

        {/* Middle-Left Country Flag & Info Overlay */}
        <div className="absolute left-4 sm:left-5 top-[38%] -translate-y-1/2 flex items-center gap-3 z-10">
          <CountryFlagSphere countryCode={country.code} size={50} />
          <div>
            <div className="font-black text-xl sm:text-2xl text-[#191F28] tracking-tight leading-none drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {country.name} ({country.code})
            </div>
            <div className="text-xs sm:text-sm font-bold text-[#4E5968] mt-1 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {t('settings.travel.country')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Saved Places Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsSavedModalOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsSavedModalOpen(true);
          }
        }}
        className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#8B95A1]/40 transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5 min-w-0 pr-2">
          <Image
            src="/assets/setting_tab/saved_setting.png"
            alt="저장한 장소"
            width={64}
            height={64}
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 pointer-events-none"
          />
          <div className="min-w-0">
            <div className="font-bold text-base text-[#191F28] flex items-center gap-2">
              <span>{t('saved.title')}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFFFFF] text-[#4E5968] border border-[#E5E8EB]">
                {savedPlaces.length}개
              </span>
            </div>
            <p className="text-xs text-[#4E5968] mt-1 leading-relaxed">
              지도에서 저장한 장소를 모아보세요.
              <br />
              여행의 추억이 더 특별해집니다.
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#8B95A1] shrink-0" />
      </div>

      {/* 3. App Install Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 pr-2">
          <Image
            src="/assets/setting_tab/download_setting.png"
            alt="앱 설치"
            width={64}
            height={64}
            className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 pointer-events-none"
          />
          <div className="min-w-0">
            <div className="font-bold text-base text-[#191F28]">
              {t('pwa.install.title')}
            </div>
            <p className="text-xs text-[#4E5968] mt-1 leading-relaxed">
              {isStandalone
                ? '현재 홈 화면 설치 모드로 실행 중입니다.'
                : isIOS
                ? 'iOS Safari [공유] 후 "홈 화면에 추가"를 탭하세요.'
                : '홈 화면에 추가하면 앱처럼\n더 빠르고 편하게 사용할 수 있어요.'}
            </p>
          </div>
        </div>

        {/* Right Action */}
        <div className="shrink-0">
          {isStandalone ? (
            <span className="px-3 py-1 rounded-full text-xs font-bold text-[#1B64DA] bg-[#FFFFFF] border border-[#E5E8EB] flex items-center gap-1 shadow-xs">
              <Check className="w-3 h-3 text-[#1B64DA]" />
              <span>설치됨</span>
            </span>
          ) : canInstall ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 rounded-xl bg-[#1B64DA] hover:bg-[#1554B8] text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('pwa.install.action')}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* 4. Travel OS (App Info & Privacy) */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/assets/setting_tab/travel_os.png"
              alt="Travel OS"
              width={56}
              height={56}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain shrink-0 pointer-events-none"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#191F28]">Travel OS</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFFFFF] text-[#4E5968] border border-[#E5E8EB]">
                {t('settings.about.version', { version: '1.0.0' })}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8B95A1] shrink-0" />
        </div>
        <p className="text-[11px] leading-relaxed text-[#8B95A1] pt-1">
          비회원 모바일 우선 PWA. 개인 식별 정보를 수집하지 않으며 여행지 설정은 기기 로컬에 보관됩니다. 단, 실시간 번역 요청 시 입력 텍스트가 번역 AI(Google Gemini API)로, 지도 검색 시 검색어와 좌표가 지도 서비스(Google Places / OpenStreetMap)로 전송되어 처리됩니다.
        </p>
      </div>

      {/* Language & Currency Quick Badges Row (Preserved state context) */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-xs space-y-1">
          <span className="text-[#8B95A1] block font-medium">{t('settings.travel.language')}</span>
          <span className="font-bold text-[#191F28] text-sm">
            {SUPPORTED_LANGUAGES.find((l) => l.code === targetLang)?.name || targetLang}
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-xs space-y-1">
          <span className="text-[#8B95A1] block font-medium">{t('settings.travel.currency')}</span>
          <span className="font-bold text-[#191F28] text-sm">
            {localCurrency} ({country.currencySymbol})
          </span>
        </div>
      </div>

      {/* 5. Device Storage Reset Section */}
      <div className="bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#4E5968] flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-[#8B95A1]" />
            <span>{t('settings.storage.title')}</span>
          </span>
          <button
            type="button"
            onClick={() => setIsConfirmResetOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] text-rose-600 text-xs font-bold transition-all active:scale-95 shadow-xs"
          >
            {t('settings.storage.clear_action')}
          </button>
        </div>
        <p className="text-[11px] text-[#8B95A1] leading-relaxed">
          이 기기에 저장된 여행지 설정, 검색 기록, 저장한 장소 데이터를 초기화합니다.
        </p>
      </div>

      {/* Saved Places Modal */}
      <SavedPlacesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
      />

      {/* Country Picker Modal (P0 2-step confirmation) */}
      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        countries={COUNTRIES}
        selectedCode={country.code}
        onConfirm={(nextCountry) => {
          if (nextCountry.code !== country.code) {
            setCountry(nextCountry);
            showToast(`${nextCountry.name}(으)로 여행 설정을 변경했어요`, 'success');
          }
          setIsCountryPickerOpen(false);
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
                type="button"
                onClick={() => setIsConfirmResetOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] text-xs font-bold border border-[#E5E8EB] transition-colors"
              >
                {t('common.action.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllData();
                  setIsConfirmResetOpen(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors"
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
