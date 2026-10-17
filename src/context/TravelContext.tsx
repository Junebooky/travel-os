'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Country, Place, PlaceCategory } from '@/types/travel';
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
  activeTab: 'map' | 'translate' | 'currency' | 'settings' | 'saved';
  setActiveTab: (tab: 'map' | 'translate' | 'currency' | 'settings' | 'saved') => void;
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
}

const TravelContext = createContext<TravelContextType | undefined>(undefined);

const STORAGE_KEY_ONBOARDING = 'travel_os_onboarding_v1';
const STORAGE_KEY_COUNTRY = 'travel_os_country_v1';
const STORAGE_KEY_LANG = 'travel_os_lang_v1';
const STORAGE_KEY_CURRENCY = 'travel_os_currency_v1';
const STORAGE_KEY_SAVED = 'travel_os_saved_places_v1';

function getInitialCountry(): Country {
  if (typeof window !== 'undefined') {
    try {
      const code = localStorage.getItem(STORAGE_KEY_COUNTRY);
      if (code) {
        const found = COUNTRIES.find((c) => c.code === code);
        if (found) return found;
      }
    } catch {
      // ignore
    }
  }
  return COUNTRIES[0];
}

function getInitialLang(): string {
  if (typeof window !== 'undefined') {
    try {
      const lang = localStorage.getItem(STORAGE_KEY_LANG);
      if (lang) return lang;
    } catch {
      // ignore
    }
  }
  return COUNTRIES[0].defaultLang;
}

function getInitialCurrency(): string {
  if (typeof window !== 'undefined') {
    try {
      const curr = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (curr) return curr;
    } catch {
      // ignore
    }
  }
  return COUNTRIES[0].defaultCurrency;
}

function getInitialOnboarding(): boolean {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true';
    } catch {
      // ignore
    }
  }
  return false;
}

function getInitialSavedPlaces(): Place[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SAVED);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
  }
  return [];
}

export function TravelProvider({ children }: { children: ReactNode }) {
  const [country, setCountryState] = useState<Country>(getInitialCountry);
  const [sourceLang, setSourceLang] = useState<string>('ko');
  const [targetLang, setTargetLang] = useState<string>(getInitialLang);
  const [homeCurrency, setHomeCurrency] = useState<string>('KRW');
  const [localCurrency, setLocalCurrency] = useState<string>(getInitialCurrency);
  const [activePlace, setActivePlace] = useState<Place | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'translate' | 'currency' | 'settings' | 'saved'>('map');
  const [mapViewport, setMapViewport] = useState<{ center: { lat: number; lng: number }; zoom: number }>(() => ({
    center: country.defaultCenter,
    zoom: country.defaultZoom,
  }));
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(getInitialOnboarding);
  const [savedPlaces, setSavedPlaces] = useState<Place[]>(getInitialSavedPlaces);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    try {
      localStorage.setItem(STORAGE_KEY_ONBOARDING, val ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);

  const setCountry = useCallback((c: Country) => {
    setCountryState(c);
    setTargetLang(c.defaultLang);
    setLocalCurrency(c.defaultCurrency);
    setMapViewport({ center: c.defaultCenter, zoom: c.defaultZoom });
    setActivePlace(null);
    setSelectedCategory('all');
    setSearchQuery('');

    try {
      localStorage.setItem(STORAGE_KEY_COUNTRY, c.code);
      localStorage.setItem(STORAGE_KEY_LANG, c.defaultLang);
      localStorage.setItem(STORAGE_KEY_CURRENCY, c.defaultCurrency);
    } catch {
      // ignore
    }
  }, []);

  const savePlace = useCallback((place: Place) => {
    setSavedPlaces((prev) => {
      if (prev.some((p) => p.id === place.id)) return prev;
      const updated = [place, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    showToast(t('saved.success'), 'success');
  }, [showToast]);

  const removePlace = useCallback((placeId: string) => {
    setSavedPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== placeId);
      try {
        localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      } catch {
        // ignore
      }
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
    try {
      localStorage.removeItem(STORAGE_KEY_SAVED);
    } catch {
      // ignore
    }
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
    setTargetLang('ja');
    setHomeCurrency('KRW');
    setLocalCurrency('JPY');
    setActivePlace(null);
    setActiveTab('map');
    setMapViewport({ center: COUNTRIES[0].defaultCenter, zoom: COUNTRIES[0].defaultZoom });
    setOnboardingCompletedState(false);
    setSavedPlaces([]);
    setSelectedCategory('all');
    setSearchQuery('');
    showToast(t('settings.storage.clear_success'), 'success');
  }, [showToast]);

  const returnToMapWithPlace = useCallback((place?: Place | null) => {
    setActiveTab('map');
    if (place) {
      setActivePlace(place);
      setMapViewport({
        center: { lat: place.lat, lng: place.lng },
        zoom: 15,
      });
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
