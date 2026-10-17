export type PlaceCategory =
  | 'all'
  | 'food'
  | 'cafe'
  | 'convenience'
  | 'pharmacy'
  | 'shopping'
  | 'attraction'
  | 'transit'
  | 'emergency';

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  categoryName?: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: string;
  openNow?: boolean;
  hoursText?: string;
  phone?: string;
  website?: string;
  distance?: string;
  description?: string;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  defaultLang: string;
  defaultCurrency: string;
  defaultCenter: {
    lat: number;
    lng: number;
  };
  defaultZoom: number;
  currencySymbol: string;
  popularPlaces: Place[];
}

export interface QuickPhrase {
  id: string;
  category: PlaceCategory;
  korean: string;
  targetTranslations: Record<string, string>;
  romanizations?: Record<string, string>;
}

export interface TravelState {
  country: Country;
  sourceLang: string;
  targetLang: string;
  homeCurrency: string;
  localCurrency: string;
  activePlace: Place | null;
  activeTab: 'map' | 'translate' | 'currency' | 'settings' | 'saved';
  mapViewport: {
    center: { lat: number; lng: number };
    zoom: number;
  };
  onboardingCompleted: boolean;
  savedPlaces: Place[];
  isOnline: boolean;
}

export interface ExchangeRateData {
  provider: string;
  rateDate: string;
  rates: Record<string, number>;
  base: string;
  isStale?: boolean;
}
