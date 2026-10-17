'use client';

import React from 'react';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';
import { Map, Languages, Coins, Settings, Wallet } from 'lucide-react';

export default function Navigation() {
  const { activeTab, setActiveTab } = useTravel();

  const tabs: Array<{
    id: 'map' | 'translate' | 'currency' | 'wallet' | 'settings';
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'map', labelKey: 'map.tab', icon: Map },
    { id: 'translate', labelKey: 'translate.tab', icon: Languages },
    { id: 'currency', labelKey: 'currency.tab', icon: Coins },
    { id: 'wallet', labelKey: 'wallet.tab', icon: Wallet },
    { id: 'settings', labelKey: 'settings.tab', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center relative transition-all rounded-xl active:scale-95 ${
                isActive ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-blue-950/70 text-blue-400 shadow-inner' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">
                {t(tab.labelKey)}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-blue-400 absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
