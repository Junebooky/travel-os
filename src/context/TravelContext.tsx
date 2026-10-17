import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Country, Place, PlaceCategory, ExpenseRecord, ExchangeRateData } from '@/types/travel';
import { COUNTRIES } from '@/data/countries';
import { t } from '@/lib/i18n';

interface ToastInfo {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
}

export interface CurrencyConversionResult {
  krw: number;
  rate: number;
  provider: string;
  date: string;
  isStale?: boolean;
}

export interface AddExpenseOptions {
  force?: boolean;
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
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>, options?: AddExpenseOptions) => boolean;
  deleteExpense: (id: string) => void;
  clearAllExpenses: () => void;
  rates: ExchangeRateData | null;
  refreshRates: () => Promise<ExchangeRateData | null>;
  convertCurrencyToKrw: (amount: number, currency: string) => CurrencyConversionResult | null;
}

const TravelContext = createContext<TravelContextType | undefined>(undefined);

export const STORAGE_KEY_ONBOARDING = 'travel_os_onboarding_v1';
export const STORAGE_KEY_COUNTRY = 'travel_os_country_v1';
export const STORAGE_KEY_LANG = 'travel_os_lang_v1';
export const STORAGE_KEY_CURRENCY = 'travel_os_currency_v1';
export const STORAGE_KEY_SAVED = 'travel_os_saved_places_v1';
export const STORAGE_KEY_VIEWPORT = 'travel_os_viewport_v1';
export const STORAGE_KEY_WALLET = 'travel_os_wallet_v1';
export const STORAGE_KEY_LAST_RATES = 'travel_os_last_rates_v1';
export const MAX_RATE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function getValidatedCachedRates(): ExchangeRateData | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_LAST_RATES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.provider === 'string' &&
      typeof parsed.rateDate === 'string' &&
      parsed.rates &&
      typeof parsed.rates === 'object'
    ) {
      const parsedTime = new Date(parsed.rateDate).getTime();
      if (!Number.isNaN(parsedTime)) {
        const age = Date.now() - parsedTime;
        if (age >= 0 && age <= MAX_RATE_AGE_MS) {
          return {
            ...parsed,
            isStale: true,
          };
        }
      }
    }
  } catch {
    // Corrupt cache
  }
  return null;
}

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
  const expensesRef = useRef<ExpenseRecord[]>(expenses);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);
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

  const [rates, setRates] = useState<ExchangeRateData | null>(getValidatedCachedRates);

  const refreshRates = useCallback(async (): Promise<ExchangeRateData | null> => {
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.rates) {
          setRates(data);
          safeSetItem(STORAGE_KEY_LAST_RATES, JSON.stringify(data));
          return data;
        }
      }
    } catch {
      // ignore
    }
    const cached = getValidatedCachedRates();
    if (cached) {
      setRates(cached);
      return cached;
    }
    return null;
  }, []);

  useEffect(() => {
    let ignore = false;
    async function initRates() {
      try {
        const res = await fetch('/api/rates');
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.rates && !ignore) {
            setRates(data);
            safeSetItem(STORAGE_KEY_LAST_RATES, JSON.stringify(data));
          }
        }
      } catch {
        // ignore
      }
    }
    initRates();
    return () => {
      ignore = true;
    };
  }, []);

  const convertCurrencyToKrw = useCallback(
    (amount: number, currency: string): CurrencyConversionResult | null => {
      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return null;
      if (currency === 'KRW') {
        return {
          krw: Math.round(amount),
          rate: 1,
          provider: '기준 통화 (KRW)',
          date: new Date().toISOString().split('T')[0],
        };
      }
      const currentRates = rates || getValidatedCachedRates();
      if (!currentRates || !currentRates.rates) return null;
      const rateVal = currentRates.rates[currency];
      if (typeof rateVal !== 'number' || isNaN(rateVal) || rateVal <= 0) {
        return null;
      }
      const krwPerUnit = 1 / rateVal;
      return {
        krw: Math.round(amount * krwPerUnit),
        rate: Math.round(krwPerUnit * 100) / 100,
        provider: currentRates.provider,
        date: currentRates.rateDate,
        isStale: currentRates.isStale,
      };
    },
    [rates]
  );

  const addExpense = useCallback(
    (item: Omit<ExpenseRecord, 'id' | 'timestamp'>, options?: AddExpenseOptions): boolean => {
      const now = Date.now();
      const currentExpenses = expensesRef.current;
      const isDuplicate = currentExpenses.some(
        (e) =>
          e.placeName.trim() === item.placeName.trim() &&
          e.amount === item.amount &&
          e.currency === item.currency &&
          now - e.timestamp < 2 * 60 * 1000
      );

      if (isDuplicate && !options?.force) {
        showToast(t('wallet.duplicate.blocked'), 'info');
        return false;
      }

      const newRecord: ExpenseRecord = {
        ...item,
        id: 'exp-' + now + '-' + Math.random().toString(36).substring(2, 7),
        timestamp: now,
      };

      const next = [newRecord, ...currentExpenses];
      // Synchronously update the ref so any rapid consecutive clicks immediately see the new item
      expensesRef.current = next;

      // Pure React state update
      setExpenses(next);

      // Persistence side effect outside React updater
      safeSetItem(STORAGE_KEY_WALLET, JSON.stringify(next));

      showToast(t('wallet.toast.saved'), 'success');
      return true;
    },
    [showToast]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      const next = expensesRef.current.filter((e) => e.id !== id);
      expensesRef.current = next;
      setExpenses(next);
      safeSetItem(STORAGE_KEY_WALLET, JSON.stringify(next));
      showToast(t('wallet.toast.deleted'), 'info');
    },
    [showToast]
  );

  const clearAllExpenses = useCallback(() => {
    expensesRef.current = [];
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
        rates,
        refreshRates,
        convertCurrencyToKrw,
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
