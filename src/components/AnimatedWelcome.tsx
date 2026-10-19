'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useTravel } from '@/context/TravelContext';
import { SELECTABLE_COUNTRIES } from '@/data/countries';
import CountryPickerModal from '@/components/CountryPickerModal';
import CountryFlagIcon from '@/components/CountryFlagIcon';

interface AnimatedWelcomeProps {
  onNavigate: (tab: 'map' | 'translate' | 'currency' | 'wallet' | 'settings') => void;
}

// 3D Isometric Cube Component
function IsometricCube({
  className,
  size = 50,
  opacity = 0.55,
}: {
  className?: string;
  size?: number;
  opacity?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      className={className}
      style={{ opacity }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Top isometric face (brightest) */}
      <polygon points="30,5 55,19 30,33 5,19" fill="#58E6F5" fillOpacity="0.85" />
      {/* Left isometric face (mid tone) */}
      <polygon points="5,19 30,33 30,58 5,44" fill="#29D2E5" fillOpacity="0.65" />
      {/* Right isometric face (depth tone) */}
      <polygon points="30,33 55,19 55,44 30,58" fill="#11ABC0" fillOpacity="0.55" />
    </svg>
  );
}

export default function AnimatedWelcome({ onNavigate }: AnimatedWelcomeProps) {
  const { country, setCountry } = useTravel();
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

  const currentCountryName = country?.name || '미국';
  const currentCountryCode = country?.code || 'US';

  return (
    <div
      role="region"
      aria-label="Travel OS Welcome"
      className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-gradient-to-b from-[#09CAE0] via-[#02BBD7] to-[#01ABCA] text-white flex flex-col justify-between overflow-hidden select-none px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))]"
    >
      {/* Background Floating Isometric 3D Cubes & Ambient Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Top-Right Cube */}
        <IsometricCube
          size={56}
          opacity={0.5}
          className="welcome-float absolute right-7 top-14 drop-shadow-xs"
        />

        {/* Mid-Left Cube */}
        <IsometricCube
          size={46}
          opacity={0.45}
          className="welcome-float-delayed absolute -left-3 top-[42%] drop-shadow-xs"
        />

        {/* Bottom-Right Cube */}
        <IsometricCube
          size={52}
          opacity={0.4}
          className="welcome-float-slow absolute -right-3 bottom-[32%] drop-shadow-xs"
        />

        {/* Ambient Glowing Dust Particles */}
        <div className="absolute left-[24%] top-[25%] w-1.5 h-1.5 rounded-full bg-white/55 blur-[0.3px]" />
        <div className="absolute right-[12%] top-[38%] w-2 h-2 rounded-full bg-white/60 blur-[0.4px]" />
        <div className="absolute left-[10%] bottom-[38%] w-2 h-2 rounded-full bg-white/45 blur-[0.4px]" />
      </div>

      {/* Mascot: Sleeping Capybara on Cyan Cube (Roams smoothly in background) */}
      <div
        className="capybara-roam absolute top-1 -left-2 z-0 pointer-events-none select-none drop-shadow-md"
        aria-hidden="true"
      >
        <Image
          src="/assets/welcome_capybara.png"
          alt="Travel OS Mascot"
          width={200}
          height={135}
          priority
          className="object-contain w-44 sm:w-48 h-auto"
        />
      </div>

      {/* Middle Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center my-auto pt-24 pb-4">
        {/* TRAVEL OS Logo with smile accent under OS */}
        <div className="flex items-center gap-1.5 text-2xl sm:text-[28px] font-black text-white tracking-wide drop-shadow-xs">
          <span>TRAVEL</span>
          <span className="relative">
            OS
            <svg
              className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-8 h-2.5 text-white"
              viewBox="0 0 32 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 2C9 8 23 8 29 2"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>

        {/* Main Headline */}

        <h1 className="text-[50px] sm:text-[46px] font-['Pretendard_Variable'] font-black leading-[1.12] tracking-[-0.045em] drop-shadow-[0_2px_2px_rgba(0,0,0,0.12)] mt-8 text-center">
          <span className="block text-white">
            여행 준비,
          </span>
          <span className="block text-[#C8FFE8]">
            여기서 끝내요.
          </span>
        </h1>


        {/* Sub-headline */}
        <p className="text-base sm:text-lg font-bold text-white/95 leading-relaxed mt-4 drop-shadow-2xs text-center">
          나라만 고르면<br />
          바로 시작할 수 있어요.
        </p>
      </section>

      {/* Bottom Interactive Section */}
      <div className="relative z-10 w-full pb-2">
        {/* Section label: 여행할 나라 */}
        <div className="w-full pl-2 mb-2">
          <span className="text-sm font-bold text-white tracking-tight">
            여행할 나라
          </span>
        </div>

        {/* Country Selection Card */}
        <button
          type="button"
          onClick={() => setIsCountryPickerOpen(true)}
          className="w-full rounded-[28px] bg-[#9DECF7]/90 hover:bg-[#A8EFF9] active:scale-[0.99] border border-white/60 p-3 sm:p-3.5 shadow-sm flex items-center justify-between transition-all cursor-pointer backdrop-blur-xs group"
          aria-label={`여행할 나라: ${currentCountryName}, 변경하기`}
        >
          {/* Flag & Country Name */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-11 bg-white rounded-2xl shadow-xs border border-white/90 flex items-center justify-center p-1 shrink-0 overflow-hidden">
              <CountryFlagIcon
                countryCode={currentCountryCode}
                width={42}
                height={28}
                shape="rounded"
              />
            </div>
            <span className="text-xl font-extrabold text-[#0B3A42] tracking-tight truncate">
              {currentCountryName}
            </span>
          </div>

          {/* 변경 Pill Button */}
          <div className="px-5 py-2.5 rounded-full bg-[#B5F4E1] group-hover:bg-[#A3EED7] text-[#0B726B] font-extrabold text-sm shadow-xs transition-colors shrink-0">
            변경
          </div>
        </button>

        {/* Primary CTA Button: 여행 시작하기 */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="w-full min-h-[64px] rounded-[28px] bg-gradient-to-r from-[#0C857D] via-[#097D75] to-[#056E67] hover:brightness-105 active:scale-[0.99] shadow-lg flex items-center justify-center relative px-6 cursor-pointer mt-3.5 transition-all group"
          aria-label="여행 시작하기"
        >
          <span className="text-xl font-black text-white tracking-tight">
            여행 시작하기
          </span>
          <div className="absolute right-3.5 w-11 h-11 rounded-full bg-[#035952] flex items-center justify-center text-white shadow-inner group-hover:translate-x-0.5 transition-transform">
            <ArrowRight className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
          </div>
        </button>
      </div>

      {/* Dynamic Country Selector Modal */}
      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        countries={SELECTABLE_COUNTRIES}
        selectedCode={currentCountryCode}
        onConfirm={(selected) => {
          setCountry(selected);
          setIsCountryPickerOpen(false);
        }}
        onClose={() => setIsCountryPickerOpen(false)}
      />
    </div>
  );
}
