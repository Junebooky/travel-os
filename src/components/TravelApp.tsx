'use client';

import React, { useSyncExternalStore } from 'react';
import { useTravel } from '@/context/TravelContext';
import Onboarding from '@/components/Onboarding';
import AnimatedWelcome from '@/components/AnimatedWelcome';
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
  const { onboardingCompleted, activeTab, setActiveTab, activePlace, isOnline } = useTravel();
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [hasVisitedMap, setHasVisitedMap] = React.useState<boolean>(activeTab === 'map');
  const [prevTab, setPrevTab] = React.useState<string>(activeTab);
  const [welcomeDismissed, setWelcomeDismissed] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search && window.location.search.length > 1) return true;
    }
    return Boolean(activePlace);
  });

  if (activeTab !== prevTab) {
    setPrevTab(activeTab);
    if (activeTab === 'map' && !hasVisitedMap) {
      setHasVisitedMap(true);
    }
  }

  if (!isMounted) {
    return (
      <div className="relative min-h-[100dvh] w-full max-w-md mx-auto bg-[#FFFFFF] text-[#191F28] shadow-2xl flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#087F8C] flex items-center justify-center shadow-lg animate-pulse">
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

      {/* Content Rendering based on Onboarding & Welcome state */}
      {!onboardingCompleted ? (
        <Onboarding />
      ) : !welcomeDismissed ? (
        <AnimatedWelcome
          onNavigate={(tab) => {
            setActiveTab(tab);
            setWelcomeDismissed(true);
            if (tab === 'map') {
              setHasVisitedMap(true);
            }
          }}
        />
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
            {activeTab === 'settings' && (
              <SettingsView onOpenWelcome={() => setWelcomeDismissed(false)} />
            )}
          </main>

          {/* Bottom Persistent Navigation Bar */}
          <Navigation />
        </>
      )}
    </div>
  );
}
