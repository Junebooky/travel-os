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
    <nav
      role="navigation"
      aria-label="하단 주 네비게이션"
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-[#FFFFFF] border-t border-[#E5E8EB] px-1 sm:px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={t(tab.labelKey)}
              className={`flex-1 min-h-[48px] py-1 px-0.5 flex flex-col items-center justify-center relative transition-all rounded-xl active:scale-95 ${
                isActive ? 'text-[#1B64DA] font-extrabold' : 'text-[#8B95A1] hover:text-[#4E5968]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'text-[#1B64DA]' : 'text-[#8B95A1]'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
