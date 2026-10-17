export type PlaceCategory =
  | 'all'
  | 'food'
  | 'cafe'
  | 'shopping'
  | 'market'
  | 'stay'
  | 'pharmacy'
  | 'airport'
  | 'transport'
  | 'convenience'
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
  activeTab: 'map' | 'translate' | 'currency' | 'wallet' | 'settings' | 'saved';
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

// Track B Phase 2 Extension Types
export interface ChatMessage {
  id: string;
  speaker: 'me' | 'partner';
  originalText: string;
  translatedText: string;
  timestamp: number;
}

export interface MenuItemOCR {
  id: string;
  originalName: string;
  translatedName: string;
  originalPrice: number;
  currency: string;
  estimatedKrw: number;
  description?: string;
  confidence?: number;
}

export interface ExpenseRecord {
  id: string;
  amount: number;
  currency: string;
  amountKrw: number;
  placeName: string;
  category: PlaceCategory;
  paymentMethod: 'cash' | 'card';
  timestamp: number;
  memo?: string;
  rateUsed?: {
    rate: number;
    provider: string;
    date: string;
  };
}
