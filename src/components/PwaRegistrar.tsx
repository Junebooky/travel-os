'use client';

import { useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __travel_os_deferred_prompt?: BeforeInstallPromptEvent | null;
  }
}

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Register Service Worker for safe static app shell
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[TravelOS PWA] Service Worker registered:', reg.scope);
          })
          .catch((err) => {
            console.warn('[TravelOS PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 2. Capture beforeinstallprompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__travel_os_deferred_prompt = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent('travel_os_pwa_ready'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
