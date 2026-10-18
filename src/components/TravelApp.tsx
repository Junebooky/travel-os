'use client';

import React, { useSyncExternalStore } from 'react';
import { useTravel } from '@/context/TravelContext';
import Onboarding from '@/components/Onboarding';
import MapView from '@/components/MapView';
import TranslateView from '@/components/TranslateView';
import CurrencyView from '@/components/CurrencyView';
import WalletView from '@/components/WalletView';
import SettingsView from '@/components/SettingsView';
import Navigation from '@/components/Navigation';
import ToastContainer from '@/components/ToastContainer';
import { WifiOff, Compass } from 'lucide-react';
import { t } from '@/lib/i18n';

const emptySubscribe = () => () => {};

export default function TravelApp() {
  const { onboardingCompleted, activeTab, isOnline } = useTravel();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [hasVisitedMap, setHasVisitedMap] = React.useState<boolean>(activeTab === 'map');
  const [prevTab, setPrevTab] = React.useState<string>(activeTab);

  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    if (activeTab === 'map' && !hasVisitedMap) {
      setHasVisitedMap(true);
    }
  }

  if (!isMounted) {
    return (
      <div className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-[#FFFFFF] text-[#191F28] shadow-2xl flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1B64DA] flex items-center justify-center shadow-lg shadow-blue-500/20 animate-pulse">
          <Compass className="w-6 h-6 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-[#FFFFFF] text-[#191F28] shadow-2xl flex flex-col overflow-hidden">
      {/* Offline Status Top Alert */}
      {!isOnline && (
        <div className="bg-[#4E5968] text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-1.5 z-50">
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
          <main className="flex-1 overflow-y-auto relative">
            {/* MapView persistent DOM container: lazy-loaded on first visit, preserved across 10+ tab switches */}
            {hasVisitedMap && (
              <div
                id="persistent-map-container"
                data-testid="persistent-map-container"
                className={`w-full h-full ${activeTab === 'map' ? 'block' : 'hidden'}`}
                aria-hidden={activeTab !== 'map'}
                inert={activeTab !== 'map' ? true : undefined}
                style={{ display: activeTab === 'map' ? 'block' : 'none' }}
              >
                <MapView isTabActive={activeTab === 'map'} />
              </div>
            )}
            {activeTab === 'translate' && <TranslateView />}
            {activeTab === 'currency' && <CurrencyView />}
            {activeTab === 'wallet' && <WalletView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          {/* Bottom Persistent Navigation Bar */}
          <Navigation />
        </>
      )}
    </div>
  );
}
