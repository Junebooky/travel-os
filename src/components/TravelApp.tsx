'use client';

import React from 'react';
import { useTravel } from '@/context/TravelContext';
import Onboarding from '@/components/Onboarding';
import MapView from '@/components/MapView';
import TranslateView from '@/components/TranslateView';
import CurrencyView from '@/components/CurrencyView';
import SettingsView from '@/components/SettingsView';
import Navigation from '@/components/Navigation';
import ToastContainer from '@/components/ToastContainer';
import { WifiOff } from 'lucide-react';
import { t } from '@/lib/i18n';

export default function TravelApp() {
  const { onboardingCompleted, activeTab, isOnline } = useTravel();

  return (
    <div className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-slate-950 shadow-2xl flex flex-col overflow-hidden">
      {/* Offline Status Top Alert */}
      {!isOnline && (
        <div className="bg-amber-600/95 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 z-50">
          <WifiOff className="w-3.5 h-3.5" />
          <span>{t('common.network.offline_title')}</span>
        </div>
      )}

      {/* Global Toast Container */}
      <ToastContainer />

      {/* Content Rendering based on Onboarding state */}
      {!onboardingCompleted ? (
        <Onboarding />
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            {activeTab === 'map' && <MapView />}
            {activeTab === 'translate' && <TranslateView />}
            {activeTab === 'currency' && <CurrencyView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          {/* Bottom Persistent Navigation Bar */}
          <Navigation />
        </>
      )}
    </div>
  );
}
