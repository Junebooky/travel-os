'use client';

import React from 'react';
import Image from 'next/image';
import { useTravel } from '@/context/TravelContext';
import { t } from '@/lib/i18n';

export default function Navigation() {
  const { activeTab, setActiveTab } = useTravel();

  const tabs: Array<{
    id: 'map' | 'translate' | 'currency' | 'wallet' | 'settings';
    labelKey: string;
    imageSrc: string;
  }> = [
      { id: 'map', labelKey: 'map.tab', imageSrc: '/assets/clay/map.png' },
      { id: 'translate', labelKey: 'translate.tab', imageSrc: '/assets/clay/translate.png' },
      { id: 'currency', labelKey: 'currency.tab', imageSrc: '/assets/clay/exchange.png' },
      { id: 'wallet', labelKey: 'wallet.tab', imageSrc: '/assets/clay/wallet.png' },
      { id: 'settings', labelKey: 'settings.tab', imageSrc: '/assets/clay/setting.png' },
    ];

  return (
    <nav
      role="navigation"
      aria-label="하단 주 네비게이션"
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-[#FFFFFF] border-t border-[#E5E8EB] px-1 sm:px-2 pt-1 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={t(tab.labelKey)}
              className={`flex-1 min-h-[48px] py-1 px-0.5 flex flex-col items-center justify-center relative transition-all rounded-xl active:scale-95 ${isActive ? 'text-[#1B64DA]' : 'text-[#4E5968]'
                }`}
            >
              <div
                className={`relative flex items-center justify-center transition-all duration-200 ${isActive
                  ? 'scale-110 drop-shadow-[0_2px_6px_rgba(27,100,218,0.22)]'
                  : 'opacity-70 grayscale-[15%] hover:opacity-100'
                  }`}
              >
                <Image
                  src={tab.imageSrc}
                  alt={t(tab.labelKey)}
                  width={36}
                  height={36}
                  className="w-[30px] h-[30px] object-contain select-none pointer-events-none transition-transform duration-200"
                  priority
                />
              </div>
              <span
                className={`text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full ${isActive ? 'text-[#1B64DA] font-bold' : 'text-[#4E5968] font-medium'
                  }`}
              >
                {t(tab.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
