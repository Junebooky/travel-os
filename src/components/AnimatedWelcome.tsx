'use client';

import React from 'react';
import { useTravel } from '@/context/TravelContext';
import {
  Compass,
  MapPin,
  Languages,
  Coins,
  Wallet,
  Plane,
  Globe,
  ArrowRight,
} from 'lucide-react';

interface AnimatedWelcomeProps {
  onNavigate: (tab: 'map' | 'translate' | 'currency' | 'wallet' | 'settings') => void;
}

export default function AnimatedWelcome({ onNavigate }: AnimatedWelcomeProps) {
  const { country } = useTravel();

  return (
    <div
      role="region"
      aria-label="Travel OS 시작 화면"
      className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-[#FFFFFF] text-[#191F28] flex flex-col justify-between p-5 sm:p-6 overflow-y-auto pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] select-none"
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between z-10 w-full mb-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black tracking-[0.22em] text-[#087F8C]">
            TRAVEL OS
          </span>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#13C2D6]" aria-hidden="true" />
        </div>

        {/* Dynamic Destination Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E5E8EB] text-xs font-semibold text-[#191F28] shadow-xs shrink-0"
          aria-label={`현재 선택된 여행지: ${country?.name || '여행지'}`}
        >
          <span className="text-sm leading-none" aria-hidden="true">
            {country?.flag || '✈️'}
          </span>
          <span>{country?.name || '여행'} 여행</span>
        </div>
      </header>

      {/* Middle Visual & Motion Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center my-auto py-4 z-10 text-center w-full min-h-[300px]">
        {/* Animated Mint Scene Hero Canvas */}
        <div className="relative w-full max-w-[320px] aspect-4/3 rounded-3xl bg-gradient-to-b from-[#13C2D6]/15 via-[#13C2D6]/5 to-[#FFFFFF] border border-[#E5E8EB] p-6 flex flex-col items-center justify-center overflow-hidden shadow-xs mb-6">
          {/* Subtle Background Decorative Rings */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40"
            aria-hidden="true"
          >
            <div className="w-56 h-56 rounded-full border border-[#13C2D6]/40" />
            <div className="absolute w-40 h-40 rounded-full border border-[#087F8C]/20" />
          </div>

          {/* Floating Element 1: Main Globe (Center) */}
          <div
            className="welcome-float relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-[#13C2D6] to-[#087F8C] flex items-center justify-center text-white shadow-md pointer-events-none select-none"
            aria-hidden="true"
          >
            <Globe className="w-12 h-12 stroke-[1.75]" />
          </div>

          {/* Floating Element 2: Flight / Plane (Top-Right) */}
          <div
            className="welcome-float-delayed absolute top-5 right-6 z-20 w-11 h-11 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center text-[#087F8C] shadow-sm pointer-events-none select-none rotate-12"
            aria-hidden="true"
          >
            <Plane className="w-6 h-6 stroke-[2]" />
          </div>

          {/* Floating Element 3: Compass / Spot (Bottom-Left) */}
          <div
            className="welcome-float-slow absolute bottom-5 left-6 z-20 w-11 h-11 rounded-2xl bg-[#FFFFFF] border border-[#E5E8EB] flex items-center justify-center text-[#087F8C] shadow-sm pointer-events-none select-none -rotate-12"
            aria-hidden="true"
          >
            <Compass className="w-6 h-6 stroke-[2]" />
          </div>

          {/* Floating Pill Badge: Destination */}
          <div
            className="welcome-float-delayed absolute bottom-3 right-5 z-20 px-2.5 py-1 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#E5E8EB] flex items-center gap-1 text-[11px] font-bold text-[#191F28] shadow-xs pointer-events-none select-none"
            aria-hidden="true"
          >
            <MapPin className="w-3 h-3 text-[#087F8C]" />
            <span>{country?.name || '현지'}</span>
          </div>
        </div>

        {/* Headlines */}
        <h1 className="text-2xl sm:text-[28px] font-black text-[#191F28] tracking-tight leading-snug break-keep max-w-[340px]">
          여행, 어디서부터 시작할까요?
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#4E5968] mt-2 max-w-[320px] break-keep">
          필요한 순간, Travel OS가 함께해요.
        </p>
      </section>

      {/* Bottom Actions Section */}
      <footer className="space-y-4 z-10 w-full shrink-0 pt-2">
        {/* Primary Action Button: 지도에서 시작하기 */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className="w-full min-h-[52px] py-3.5 px-5 rounded-2xl bg-[#087F8C] hover:bg-[#066B77] active:scale-[0.99] text-white font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C] focus-visible:ring-offset-2"
        >
          <span>지도에서 시작하기</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
        </button>

        {/* 3 Direct Feature Shortcuts */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('translate')}
            className="min-h-[52px] py-2.5 px-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] active:scale-95 text-[#191F28] transition-all flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C]"
            aria-label="바로 번역 탭으로 이동"
          >
            <Languages className="w-4 h-4 text-[#087F8C]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight">바로 번역</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('currency')}
            className="min-h-[52px] py-2.5 px-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] active:scale-95 text-[#191F28] transition-all flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C]"
            aria-label="환율 계산 탭으로 이동"
          >
            <Coins className="w-4 h-4 text-[#087F8C]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight">환율 계산</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('wallet')}
            className="min-h-[52px] py-2.5 px-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E5E8EB] active:scale-95 text-[#191F28] transition-all flex flex-col items-center justify-center gap-1 shadow-xs cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C]"
            aria-label="여행 지갑 탭으로 이동"
          >
            <Wallet className="w-4 h-4 text-[#087F8C]" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-semibold leading-tight">여행 지갑</span>
          </button>
        </div>

        {/* Secondary Discreet Action: 건너뛰기 */}
        <div className="text-center pt-0.5">
          <button
            type="button"
            onClick={() => onNavigate('map')}
            className="min-h-[44px] px-4 py-2 text-xs font-medium text-[#8B95A1] hover:text-[#191F28] transition-colors rounded-lg cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#087F8C]"
          >
            건너뛰기
          </button>
        </div>
      </footer>
    </div>
  );
}
