'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Country, Place, PlaceCategory, ExpenseRecord } from '@/types/travel';
import { COUNTRIES } from '@/data/countries';
import { t } from '@/lib/i18n';

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface TravelContextType {
  country: Country;
  setCountry: (country: Country) => void;
  sourceLang: string;
  setSourceLang: (lang: string) => void;
  targetLang: string;
  setTargetLang: (lang: string) => void;
  homeCurrency: string;
  setHomeCurrency: (curr: string) => void;
  localCurrency: string;
  setLocalCurrency: (curr: string) => void;
  activePlace: Place | null;
  setActivePlace: (place: Place | null) => void;
  activeTab: 'map' | 'translate' | 'currency' | 'wallet' | 'settings' | 'saved';
  setActiveTab: (tab: 'map' | 'translate' | 'currency' | 'wallet' | 'settings' | 'saved') => void;
  mapViewport: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  setMapViewport: (vp: { center: { lat: number; lng: number }; zoom: number }) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;
  savedPlaces: Place[];
  savePlace: (place: Place) => void;
  removePlace: (placeId: string) => void;
  isPlaceSaved: (placeId: string) => boolean;
  clearAllSavedPlaces: () => void;
  resetAllData: () => void;
  returnToMapWithPlace: (place?: Place | null) => void;
  isOnline: boolean;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  selectedCategory: PlaceCategory;
  setSelectedCategory: (cat: PlaceCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  expenses: ExpenseRecord[];
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>) => boolean;
  deleteExpense: (id: string) => void;
  clearAllExpenses: () => void;
}

const TravelContext = createContext<TravelContextType | undefined>(undefined);

export const STORAGE_KEY_ONBOARDING = 'travel_os_onboarding_v1';
export const STORAGE_KEY_COUNTRY = 'travel_os_country_v1';
export const STORAGE_KEY_LANG = 'travel_os_lang_v1';
export const STORAGE_KEY_CURRENCY = 'travel_os_currency_v1';
export const STORAGE_KEY_SAVED = 'travel_os_saved_places_v1';
export const STORAGE_KEY_VIEWPORT = 'travel_os_viewport_v1';
export const STORAGE_KEY_WALLET = 'travel_os_wallet_v1';

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function getInitialCountry(): Country {
  const code = safeGetItem(STORAGE_KEY_COUNTRY);
  if (code) {
    const found = COUNTRIES.find((c) => c.code === code);
    if (found) return found;
  }
  return COUNTRIES[0];
}

function getInitialLang(): string {
  const lang = safeGetItem(STORAGE_KEY_LANG);
  if (lang) return lang;
  return COUNTRIES[0].defaultLang;
}

function getInitialCurrency(): string {
  const curr = safeGetItem(STORAGE_KEY_CURRENCY);
  if (curr) return curr;
  return COUNTRIES[0].defaultCurrency;
}

function getInitialOnboarding(): boolean {
  return safeGetItem(STORAGE_KEY_ONBOARDING) === 'true';
}

function getInitialSavedPlaces(): Place[] {
  const stored = safeGetItem(STORAGE_KEY_SAVED);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Corrupt JSON: return empty without throwing
    }
  }
  return [];
}

function getInitialExpenses(): ExpenseRecord[] {
  const stored = safeGetItem(STORAGE_KEY_WALLET);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Corrupt JSON: return empty without throwing
    }
  }
  return [];
}

function getInitialViewport(initialCountry: Country): { center: { lat: number; lng: number }; zoom: number } {
  const stored = safeGetItem(STORAGE_KEY_VIEWPORT);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        parsed.center &&
        typeof parsed.center.lat === 'number' &&
        typeof parsed.center.lng === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        return parsed;
      }
    } catch {
      // Corrupt JSON fallback
    }
  }
  return { center: initialCountry.defaultCenter, zoom: initialCountry.defaultZoom };
}

export function TravelProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country>(getInitialCountry);
  const [sourceLang, setSourceLang] = useState<string>('ko');
  const [targetLang, setTargetLangState] = useState<string>(getInitialLang);
  const [homeCurrency, setHomeCurrency] = useState<string>('KRW');
  const [localCurrency, setLocalCurrencyState] = useState<string>(getInitialCurrency);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'translate' | 'currency' | 'wallet' | 'settings' | 'saved'>('map');
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(getInitialExpenses);
  const [mapViewport, setMapViewportState] = useState<{ center: { lat: number; lng: number }; zoom: number }>(() =>
    getInitialViewport(country)
  );
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(getInitialOnboarding);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(getInitialSavedPlaces);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const setTargetLang = useCallback((lang: string) => {
    setTargetLangState(lang);
    safeSetItem(STORAGE_KEY_LANG, lang);
  }, []);

  const setLocalCurrency = useCallback((curr: string) => {
    setLocalCurrencyState(curr);
    safeSetItem(STORAGE_KEY_CURRENCY, curr);
  }, []);

  const setMapViewport = useCallback((vp: { center: { lat: number; lng: number }; zoom: number }) => {
    setMapViewportState(vp);
    safeSetItem(STORAGE_KEY_VIEWPORT, JSON.stringify(vp));
  }, []);

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Sync network status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      showToast(t('common.network.back_online'), 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast(t('common.network.offline_title'), 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const setOnboardingCompleted = useCallback((val: boolean) => {
    setOnboardingCompletedState(val);
    safeSetItem(STORAGE_KEY_ONBOARDING, val ? 'true' : 'false');
  }, []);

  const setCountry = useCallback((c: Country) => {
    setCountryState(c);
    setTargetLangState(c.defaultLang);
    setLocalCurrencyState(c.defaultCurrency);
    const newViewport = { center: c.defaultCenter, zoom: c.defaultZoom };
    setMapViewportState(newViewport);
    setActivePlace(null);
    setSelectedCategory('all');
    setSearchQuery('');

    safeSetItem(STORAGE_KEY_COUNTRY, c.code);
    safeSetItem(STORAGE_KEY_LANG, c.defaultLang);
    safeSetItem(STORAGE_KEY_CURRENCY, c.defaultCurrency);
    safeSetItem(STORAGE_KEY_VIEWPORT, JSON.stringify(newViewport));
  }, []);

  const savePlace = useCallback((place: Place) => {
    setSavedPlaces((prev) => {
      if (prev.some((p) => p.id === place.id)) {
        showToast(t('saved.success'), 'info');
        return prev;
      }
      const updated = [place, ...prev];
      safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      showToast(t('saved.success'), 'success');
      return updated;
    });
  }, [showToast]);

  const removePlace = useCallback((placeId: string) => {
    setSavedPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      return updated;
    });
    showToast(t('saved.remove.success'), 'info');
  }, [showToast]);

  const isPlaceSaved = useCallback(
    (placeId: string) => savedPlaces.some((p) => p.id === placeId),
    [savedPlaces]
  );

  const clearAllSavedPlaces = useCallback(() => {
    setSavedPlaces([]);
    safeRemoveItem(STORAGE_KEY_SAVED);
    showToast(t('saved.delete_all.success'), 'info');
  }, [showToast]);

  const resetAllData = useCallback(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    setCountryState(COUNTRIES[0]);
    setSourceLang('ko');
    setTargetLangState(COUNTRIES[0].defaultLang);
    setHomeCurrency('KRW');
    setLocalCurrencyState(COUNTRIES[0].defaultCurrency);
    setActivePlace(null);
    setActiveTab('map');
    setMapViewportState({ center: COUNTRIES[0].defaultCenter, zoom: COUNTRIES[0].defaultZoom });
    setOnboardingCompletedState(false);
    setSavedPlaces([]);
    setExpenses([]);
    setSelectedCategory('all');
    setSearchQuery('');
    showToast(t('settings.storage.clear_success'), 'success');
  }, [showToast]);

  const addExpense = useCallback(
    (item: Omit<ExpenseRecord, 'id' | 'timestamp'>) => {
      const isDuplicate = expenses.some(
        (e) =>
          e.placeName === item.placeName &&
          e.amount === item.amount &&
          e.currency === item.currency &&
          Date.now() - e.timestamp < 2 * 60 * 1000
      );

      if (isDuplicate) {
        showToast(t('wallet.duplicate.warning'), 'info');
      }

      const newRecord: ExpenseRecord = {
        ...item,
        id: 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        timestamp: Date.now(),
      };

      setExpenses((prev) => {
        const next = [newRecord, ...prev];
        safeSetItem(STORAGE_KEY_WALLET, JSON.stringify(next));
        return next;
      });

      showToast(t('wallet.toast.saved'), 'success');
      return true;
    },
    [expenses, showToast]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => {
        const next = prev.filter((e) => e.id !== id);
        safeSetItem(STORAGE_KEY_WALLET, JSON.stringify(next));
        return next;
      });
      showToast(t('wallet.toast.deleted'), 'info');
    },
    [showToast]
  );

  const clearAllExpenses = useCallback(() => {
    setExpenses([]);
    safeRemoveItem(STORAGE_KEY_WALLET);
    showToast(t('wallet.toast.cleared'), 'info');
  }, [showToast]);

  const returnToMapWithPlace = useCallback((place?: Place | null) => {
    setActiveTab('map');
    if (place) {
      setActivePlace(place);
      const newVp = {
        center: { lat: place.lat, lng: place.lng },
        zoom: 15,
      };
      setMapViewportState(newVp);
      safeSetItem(STORAGE_KEY_VIEWPORT, JSON.stringify(newVp));
    }
  }, []);

  return (
    <TravelContext.Provider
      value={{
        country,
        setCountry,
        sourceLang,
        setSourceLang,
        targetLang,
        setTargetLang,
        homeCurrency,
        setHomeCurrency,
        localCurrency,
        setLocalCurrency,
        activePlace,
        setActivePlace,
        activeTab,
        setActiveTab,
        mapViewport,
        setMapViewport,
        onboardingCompleted,
        setOnboardingCompleted,
        savedPlaces,
        savePlace,
        removePlace,
        isPlaceSaved,
        clearAllSavedPlaces,
        resetAllData,
        returnToMapWithPlace,
        isOnline,
        toasts,
        showToast,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        expenses,
        addExpense,
        deleteExpense,
        clearAllExpenses,
      }}
    >
      {children}
    </TravelContext.Provider>
  );
}

export function useTravel() {
  const context = useContext(TravelContext);
  if (!context) {
    throw new Error('useTravel must be used within a TravelProvider');
  }
  return context;
}
