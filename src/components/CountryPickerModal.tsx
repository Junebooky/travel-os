'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Plane, Search, X } from 'lucide-react';
import { Country } from '@/types/travel';
import CountryFlagIcon from './CountryFlagIcon';
import { t } from '@/lib/i18n';

const COUNTRY_SEARCH_ALIASES: Record<string, string> = {
  KR: 'korea south republic of 한국 krw 대한민국',
  JP: 'japan tokyo 일본 jpy 엔',
  US: 'united states usa america 미국 usd 달러',
  FR: 'france paris 프랑스 eur 유로',
  TW: 'taiwan taipei 대만 타이완 twd',
  TH: 'thailand bangkok 태국 thb 바트',
  VN: 'vietnam hanoi 베트남 vnd 동',
  GB: 'united kingdom uk great britain england london 영국 gbp 파운드',
  IT: 'italy rome 이탈리아 eur 유로',
  ES: 'spain madrid 스페인 eur 유로',
  SG: 'singapore 싱가포르 sgd 달러',
  DE: 'germany berlin 독일 eur 유로',
  CH: 'switzerland swiss bern zurich 스위스 chf 프랑',
  AU: 'australia sydney melbourne canberra 호주 aud 달러',
  CA: 'canada toronto vancouver ottawa 캐나다 cad 달러',
  HK: 'hong kong 홍콩 hkd 달러',
  PH: 'philippines manila 필리핀 php 페소',
  ID: 'indonesia bali jakarta 인도네시아 발리 idr 루피아',
  MY: 'malaysia kuala lumpur 말레이시아 myr 링깃',
  GU: 'guam 괌 usd 달러',
  CN: 'china beijing shanghai 중국 cny 위안',
  NL: 'netherlands holland amsterdam 네덜란드 eur 유로',
  AT: 'austria vienna 오스트리아 eur 유로',
  CZ: 'czech czechia prague 체코 czk 코루나',
};

export interface CountryPickerModalProps {
  isOpen: boolean;
  countries: Country[];
  selectedCode: string;
  onConfirm: (country: Country) => void;
  onClose: () => void;
}

export default function CountryPickerModal({
  isOpen,
  countries,
  selectedCode,
  onConfirm,
  onClose,
}: CountryPickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // Smooth slide-up / slide-down animation states
  const [prevOpen, setPrevOpen] = useState<boolean>(isOpen);
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [draftCountryCode, setDraftCountryCode] = useState<string>(selectedCode);
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setShouldRender(true);
      setDraftCountryCode(selectedCode);
      setSearchQuery('');
    }
  }

  // Handle open / close transitions smoothly
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen) {
      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      const frame = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      timer = setTimeout(() => {
        setShouldRender(false);
      }, 320);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  const handleDismiss = () => {
    onClose();
  };

  const handleConfirm = (country: Country) => {
    onConfirm(country);
  };

  // Filter countries by Korean name, country code (US, KR, etc.), or common aliases
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => {
      const alias = COUNTRY_SEARCH_ALIASES[c.code]?.toLowerCase() || '';
      return (
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        alias.includes(q) ||
        c.defaultCurrency.toLowerCase().includes(q)
      );
    });
  }, [countries, searchQuery]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!shouldRender) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on selected country button or modal container
    const timer = setTimeout(() => {
      if (selectedButtonRef.current) {
        selectedButtonRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 100);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [shouldRender, onClose]);

  if (!shouldRender) return null;

  const draftCountry =
    countries.find((c) => c.code === draftCountryCode) ||
    countries.find((c) => c.code === selectedCode) ||
    countries[0];

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end items-center sm:p-4 transition-all duration-300 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      role="presentation"
    >
      {/* Dimmed Backdrop Overlay (Click to dismiss smoothly) */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal Container with rounded top and top spacing */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-picker-title"
        aria-describedby="country-picker-desc"
        tabIndex={-1}
        className={`relative z-10 bg-[#FFFFFF] w-full sm:max-w-md h-[88dvh] max-h-[88dvh] sm:h-[820px] sm:max-h-[90vh] rounded-t-[32px] sm:rounded-3xl sm:border sm:border-[#E5E8EB] flex flex-col justify-between overflow-hidden shadow-2xl outline-none transition-transform duration-300 ease-out transform ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Top Header Region (Hero) */}
        <div className="shrink-0 px-6 pt-3 pb-3 relative overflow-hidden select-none border-b border-[#E5E8EB]/50">
          {/* Subtle Decorative Neutral Watermark (Globe & Plane) */}
          <svg
            className="absolute -top-3 right-0 w-44 h-44 opacity-[0.07] text-[#4E5968] pointer-events-none select-none"
            viewBox="0 0 182 182"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="91" cy="91" r="91" />
            <ellipse cx="91" cy="91" rx="51" ry="91" />
            <path d="M0 91h182M12 57q78 40 160 0M12 125q78-40 160 0" />
          </svg>

          {/* Grab Bar Handle */}
          <div className="w-14 h-1.5 rounded-full bg-[#D1D6DA] mx-auto mb-5" aria-hidden="true" />

          {/* Brand Badge */}
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <span className="text-xs font-extrabold tracking-[0.25em] text-[#087F8C]">
              TRAVEL OS
            </span>
            <Plane className="w-3.5 h-3.5 text-[#087F8C] rotate-12" aria-hidden="true" />
          </div>

          {/* Titles */}
          <h2
            id="country-picker-title"
            className="text-2xl sm:text-[27px] font-black text-[#191F28] tracking-tight leading-snug relative z-10"
          >
            새로운 여행을 시작해 볼까요?
          </h2>
          <p
            id="country-picker-desc"
            className="text-sm sm:text-base font-semibold text-[#6B7684] mt-1 relative z-10"
          >
            다음 여행지는 어디?
          </p>

          {/* Search Bar UI */}
          <div className="mt-3 relative z-10">
            <div className="relative flex items-center p-3 rounded-xl bg-[#FFFFFF] border border-[#E5E8EB] shadow-xs focus-within:border-[#087F8C] focus-within:ring-2 focus-within:ring-[#087F8C]/10 transition-all">
              <Search className="w-4 h-4 text-[#8B95A1] shrink-0 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="가고 싶은 나라 검색 (예: 한국, 미국, KR, US)"
                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-[#191F28] placeholder-[#8B95A1] outline-none"
                aria-label="가고 싶은 나라 검색"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-[#8B95A1] hover:text-[#191F28] hover:bg-[#F8FAFC] transition-colors shrink-0"
                  aria-label="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Middle Scrollable Country Grid (3 columns x N rows) */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8 min-h-0 overscroll-contain scroll-smooth [WebkitOverflowScrolling:touch] [scrollbar-width:thin] [scrollbar-color:#D1D6DA_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#D1D6DA] hover:[&::-webkit-scrollbar-thumb]:bg-[#8B95A1]">
          {filteredCountries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center mx-auto text-[#8B95A1] shadow-xs">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-[#191F28]">&apos;{searchQuery}&apos; 검색 결과가 없어요</p>
              <p className="text-xs text-[#8B95A1]">국가명이나 국가 코드(KR, US 등)로 다시 검색해 보세요</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-2 px-3 py-1.5 text-xs font-semibold text-[#087F8C] bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] rounded-lg transition-colors cursor-pointer"
              >
                검색어 지우기
              </button>
            </div>
          ) : (
            <div
              role="group"
              aria-label="여행지 선택 그리드"
              className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm mx-auto"
            >
              {filteredCountries.map((c) => {
                const isSelected = draftCountryCode === c.code;
                return (
                  <button
                    key={c.code}
                    ref={isSelected ? selectedButtonRef : undefined}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${c.name}${isSelected ? ', 선택 대기' : ''}`}
                    onClick={() => setDraftCountryCode(c.code)}
                    className={`relative flex flex-col items-center justify-between p-3 rounded-[20px] transition-all active:scale-[0.96] min-h-[128px] sm:min-h-[134px] bg-[#FFFFFF] outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C] ${isSelected
                      ? 'border-2 border-[#087F8C] shadow-xs'
                      : 'border border-[#E5E8EB] hover:border-[#8B95A1]/50 hover:bg-[#F8FAFC]'
                      }`}
                  >
                    {/* Selected Solid Mint Badge with White Checkmark */}
                    {isSelected && (
                      <div
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#087F8C] flex items-center justify-center text-white shadow-xs"
                        aria-hidden="true"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    )}

                    {/* 2D Flag Icon */}
                    <div className="w-full flex items-center justify-center pt-2 pb-2">
                      <CountryFlagIcon countryCode={c.code} size={56} />
                    </div>

                    {/* Country Name */}
                    <span className="text-sm sm:text-base font-bold text-[#191F28] tracking-tight mt-auto text-center truncate max-w-full">
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Fixed Footer CTA (P0: Primary '이 나라로 떠나기' directly above '닫기') */}
        <div className="shrink-0 p-4 bg-[#FFFFFF] space-y-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Primary Confirm CTA */}
          <button
            type="button"
            onClick={() => handleConfirm(draftCountry)}
            className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-[#087F8C] hover:bg-[#066B77] text-white font-bold text-base shadow-sm active:scale-[0.99] transition-all flex items-center justify-center cursor-pointer"
          >
            {t('settings.country_picker.confirm')}
          </button>

          {/* Secondary Close / Discard CTA */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] hover:text-[#191F28] font-bold text-base border border-[#E5E8EB] transition-all active:scale-[0.99] flex items-center justify-center shadow-xs cursor-pointer"
          >
            {t('common.action.close') || '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
