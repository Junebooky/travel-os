'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTravel } from '@/context/TravelContext';
import { SELECTABLE_COUNTRIES } from '@/data/countries';
import CountryPickerModal from '@/components/CountryPickerModal';
import {
  Smile,
  Wallet,
  Compass,
  Camera,
  Info,
} from 'lucide-react';

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

const COUNTRY_CITY_MAP: Record<string, { city: string; englishName: string; heroAmount: string }> = {
  JP: { city: 'Tokyo', englishName: 'Japan', heroAmount: '¥2,000' },
  TH: { city: 'Bangkok', englishName: 'Thailand', heroAmount: '฿500' },
  US: { city: 'New York', englishName: 'USA', heroAmount: '$100' },
  VN: { city: 'Da Nang', englishName: 'Vietnam', heroAmount: '₫200,000' },
  TW: { city: 'Taipei', englishName: 'Taiwan', heroAmount: 'NT$1,000' },
  FR: { city: 'Paris', englishName: 'France', heroAmount: '€50' },
  GB: { city: 'London', englishName: 'UK', heroAmount: '£50' },
  KR: { city: 'Seoul', englishName: 'Korea', heroAmount: '₩50,000' },
};

export default function AnimatedWelcome({ onNavigate }: AnimatedWelcomeProps) {
  const { country, setCountry, savedPlaces } = useTravel();
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);

  // Match the 2nd reference layout: Japan (Tokyo), JPY ⇄ KRW, ¥2,000
  const countryConfig = (country?.code && COUNTRY_CITY_MAP[country.code]) || COUNTRY_CITY_MAP.JP;
  const destinationLabel = `${countryConfig.englishName} (${countryConfig.city})`;
  const currencyWalletLabel = `${country?.defaultCurrency || 'JPY'} ⇄ KRW · Wallet`;
  const heroAmount = countryConfig.heroAmount;
  const savedPlacesCount = savedPlaces && savedPlaces.length > 0 ? savedPlaces.length : 3;

  return (
    <div
      role="region"
      aria-label="Travel OS Welcome"
      className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-gradient-to-b from-[#14C9DD] via-[#13C2D6] to-[#0FB6CA] text-white flex flex-col justify-between overflow-hidden select-none px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      {/* Background Floating Isometric 3D Cubes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Top-Right Cube (below SKIP) */}
        <IsometricCube
          size={56}
          opacity={0.5}
          className="welcome-float absolute right-6 top-20 drop-shadow-xs"
        />

        {/* Mid-Left Cube */}
        <IsometricCube
          size={44}
          opacity={0.45}
          className="welcome-float-delayed absolute -left-3 top-[38%] drop-shadow-xs"
        />

        {/* Mid-Right Cube */}
        <IsometricCube
          size={52}
          opacity={0.4}
          className="welcome-float-slow absolute -right-3 top-[44%] drop-shadow-xs"
        />

        {/* Bottom-Left Cube */}
        <IsometricCube
          size={46}
          opacity={0.35}
          className="welcome-float absolute left-3 bottom-24 drop-shadow-xs"
        />

        {/* Bottom-Right Cube */}
        <IsometricCube
          size={50}
          opacity={0.35}
          className="welcome-float-delayed absolute right-4 bottom-16 drop-shadow-xs"
        />

        {/* Ambient Glowing Dust Particles */}
        <div className="absolute left-20 top-[34%] w-2 h-2 rounded-full bg-white/45 blur-[0.5px]" />
        <div className="absolute right-24 top-[36%] w-1.5 h-1.5 rounded-full bg-white/50 blur-[0.5px]" />
        <div className="absolute left-16 bottom-[38%] w-2 h-2 rounded-full bg-white/35 blur-[0.5px]" />
        <div className="absolute right-12 bottom-[24%] w-2.5 h-2.5 rounded-full bg-white/40 blur-[0.5px]" />
      </div>

      {/* Mascot: Sleeping Capybara on Cyan Cube (Top-Left) */}
      <div
        className="welcome-float-slow absolute top-[max(3rem,env(safe-area-inset-top))] left-0 z-10 pointer-events-none select-none drop-shadow-md"
        aria-hidden="true"
      >
        <Image
          src="/assets/welcome_capybara.png"
          alt="Travel OS Mascot"
          width={185}
          height={135}
          priority
          className="object-contain w-44 sm:w-48 h-auto"
        />
      </div>

      {/* Middle Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center my-auto pt-16 pb-4">
        {/* All-in-one assistant ⓘ */}
        <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold text-white/95 mb-1 tracking-tight">
          <span>All-in-one assistant</span>
          <Info className="w-3.5 h-3.5 opacity-90" aria-hidden="true" />
        </div>

        {/* Big Bold Hero Number */}
        <div className="text-[52px] sm:text-[60px] font-black leading-none text-white tracking-tight drop-shadow-sm my-1 font-sans">
          {heroAmount}
        </div>

        {/* Configure your trip */}
        <p className="text-sm sm:text-base font-bold text-white tracking-tight mt-1">
          Configure your trip
        </p>
      </section>

      {/* Stacked 4 Capsule Pill Cards */}
      <div className="relative z-10 w-full space-y-3 mb-6">
        {/* Card 1: Japan (Tokyo) */}
        <button
          type="button"
          onClick={() => setIsCountryPickerOpen(true)}
          className="w-full min-h-[54px] px-5 py-3.5 rounded-[22px] bg-[#0A9CB0]/65 hover:bg-[#0A9CB0]/80 active:scale-[0.98] backdrop-blur-md border border-white/20 text-white flex items-center justify-between shadow-xs transition-all cursor-pointer group"
          aria-label={`Select destination: ${destinationLabel}`}
        >
          <span className="text-sm font-bold tracking-tight">
            {destinationLabel}
          </span>
          <Smile className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" aria-hidden="true" />
        </button>

        {/* Card 2: JPY ⇄ KRW · Wallet */}
        <button
          type="button"
          onClick={() => onNavigate('currency')}
          className="w-full min-h-[54px] px-5 py-3.5 rounded-[22px] bg-[#0A9CB0]/65 hover:bg-[#0A9CB0]/80 active:scale-[0.98] backdrop-blur-md border border-white/20 text-white flex items-center justify-between shadow-xs transition-all cursor-pointer group"
          aria-label={`Open currency exchange & wallet: ${currencyWalletLabel}`}
        >
          <span className="text-sm font-bold tracking-tight">
            {currencyWalletLabel}
          </span>
          <Wallet className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" aria-hidden="true" />
        </button>

        {/* Card 3: Map & 3 Saved Places */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="w-full min-h-[54px] px-5 py-3.5 rounded-[22px] bg-white/25 hover:bg-white/35 active:scale-[0.98] backdrop-blur-md border border-white/30 text-white flex items-center justify-between shadow-xs transition-all cursor-pointer group"
          aria-label={`Open map & ${savedPlacesCount} saved places`}
        >
          <span className="text-sm font-bold tracking-tight">
            Map & {savedPlacesCount} Saved Places
          </span>
          <Compass className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" aria-hidden="true" />
        </button>

        {/* Card 4: Translate · AI Menu Cam */}
        <button
          type="button"
          onClick={() => onNavigate('translate')}
          className="w-full min-h-[54px] px-5 py-3.5 rounded-[22px] bg-white/25 hover:bg-white/35 active:scale-[0.98] backdrop-blur-md border border-white/30 text-white flex items-center justify-between shadow-xs transition-all cursor-pointer group"
          aria-label="Open translator & AI menu camera"
        >
          <span className="text-sm font-bold tracking-tight">
            Translate · AI Menu Cam
          </span>
          <Camera className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" aria-hidden="true" />
        </button>
      </div>

      {/* Bottom CTA: OPEN TRAVEL OS */}
      <footer className="relative z-10 w-full text-center pb-2">
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-black tracking-[0.25em] text-white hover:text-white/80 active:scale-95 transition-all uppercase cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg"
        >
          OPEN TRAVEL OS
        </button>
      </footer>

      {/* Dynamic Country Selector Modal */}
      <CountryPickerModal
        isOpen={isCountryPickerOpen}
        countries={SELECTABLE_COUNTRIES}
        selectedCode={country?.code || 'JP'}
        onConfirm={(selected) => {
          setCountry(selected);
          setIsCountryPickerOpen(false);
        }}
        onClose={() => setIsCountryPickerOpen(false)}
      />
    </div>
  );
}
