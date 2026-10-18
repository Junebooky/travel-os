'use client';

import React, { useEffect, useRef } from 'react';
import { Check, Plane } from 'lucide-react';
import { Country } from '@/types/travel';
import CountryFlagSphere from './CountryFlagSphere';
import { t } from '@/lib/i18n';

export interface CountryPickerModalProps {
  isOpen: boolean;
  countries: Country[];
  selectedCode: string;
  onSelect: (country: Country) => void;
  onClose: () => void;
}

export default function CountryPickerModal({
  isOpen,
  countries,
  selectedCode,
  onSelect,
  onClose,
}: CountryPickerModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

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
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#FFFFFF] sm:bg-black/40 sm:backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-picker-title"
        aria-describedby="country-picker-desc"
        tabIndex={-1}
        className="bg-[#FFFFFF] w-full h-[100dvh] sm:h-[844px] sm:max-h-[92vh] sm:max-w-md sm:rounded-3xl sm:border sm:border-[#E5E8EB] flex flex-col justify-between overflow-hidden shadow-2xl relative outline-none"
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
            <span className="text-xs font-extrabold tracking-[0.25em] text-[#1B64DA]">
              TRAVEL OS
            </span>
            <Plane className="w-3.5 h-3.5 text-[#1B64DA] rotate-12" aria-hidden="true" />
          </div>

          {/* Titles */}
          <h2
            id="country-picker-title"
            className="text-2xl sm:text-[27px] font-black text-[#191F28] tracking-tight leading-snug relative z-10"
          >
            여행할 나라를 선택하세요
          </h2>
          <p
            id="country-picker-desc"
            className="text-sm sm:text-base font-semibold text-[#6B7684] mt-1 relative z-10"
          >
            어디로 떠나시나요?
          </p>
        </div>

        {/* Middle Scrollable Country Grid (3 columns x 3 rows, 8 countries) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
          <div
            role="group"
            aria-label="여행지 선택 그리드"
            className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-sm mx-auto"
          >
            {countries.map((c) => {
              const isSelected = selectedCode === c.code;
              return (
                <button
                  key={c.code}
                  ref={isSelected ? selectedButtonRef : undefined}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${c.name}${isSelected ? ', 선택됨' : ''}`}
                  onClick={() => onSelect(c)}
                  className={`relative flex flex-col items-center justify-between p-3 rounded-[20px] transition-all active:scale-[0.96] min-h-[128px] sm:min-h-[134px] bg-[#FFFFFF] outline-none focus-visible:ring-2 focus-visible:ring-[#1B64DA] ${
                    isSelected
                      ? 'border-2 border-[#1B64DA] shadow-xs'
                      : 'border border-[#E5E8EB] hover:border-[#8B95A1]/50 hover:bg-[#F8FAFC]'
                  }`}
                >
                  {/* Selected Solid Blue Badge with White Checkmark */}
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#1B64DA] flex items-center justify-center text-white shadow-xs"
                      aria-hidden="true"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}

                  {/* 3D Glossy Spherical Flag Icon */}
                  <div className="w-full flex items-center justify-center pt-1 pb-1">
                    <CountryFlagSphere countryCode={c.code} size={64} />
                  </div>

                  {/* Country Name */}
                  <span className="text-sm sm:text-base font-bold text-[#191F28] tracking-tight mt-auto text-center truncate max-w-full">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Fixed Footer CTA */}
        <div className="shrink-0 p-4 border-t border-[#E5E8EB] bg-[#FFFFFF] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8FAFC] text-[#4E5968] hover:text-[#191F28] font-bold text-base border border-[#E5E8EB] transition-all active:scale-[0.99] flex items-center justify-center shadow-xs"
          >
            {t('common.action.close') || '닫기'}
          </button>
        </div>
      </div>
    </div>
  );
}
