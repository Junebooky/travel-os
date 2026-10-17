import { PlaceCategory } from '@/types/travel';
import {
  Compass,
  Utensils,
  Coffee,
  Store,
  HeartPulse,
  ShoppingBag,
  Landmark,
  Train,
  Plane,
} from 'lucide-react';

export interface CategoryItem {
  id: PlaceCategory;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function normalizeCategory(cat: PlaceCategory | string): PlaceCategory {
  switch (cat) {
    case 'convenience':
      return 'market';
    case 'attraction':
      return 'stay';
    case 'transit':
      return 'transport';
    case 'emergency':
      return 'pharmacy';
    default:
      return cat as PlaceCategory;
  }
}

export function getCategoryLabelKey(cat: PlaceCategory | string): string {
  const normalized = normalizeCategory(cat);
  switch (normalized) {
    case 'all':
      return 'map.category.all';
    case 'food':
      return 'map.category.food';
    case 'cafe':
      return 'map.category.cafe';
    case 'shopping':
      return 'map.category.shopping';
    case 'market':
      return 'map.category.market';
    case 'stay':
      return 'map.category.stay';
    case 'pharmacy':
      return 'map.category.pharmacy';
    case 'airport':
      return 'map.category.airport';
    case 'transport':
      return 'map.category.transport';
    default:
      return 'map.category.all';
  }
}

// 9 Canonical Categories for UI Map & Translate View
// Every single labelKey strictly maps 1:1 to src/locales/ko-KR.json
export const MAP_CATEGORIES: CategoryItem[] = [
  { id: 'all', labelKey: 'map.category.all', icon: Compass },
  { id: 'food', labelKey: 'map.category.food', icon: Utensils },
  { id: 'cafe', labelKey: 'map.category.cafe', icon: Coffee },
  { id: 'market', labelKey: 'map.category.market', icon: Store },
  { id: 'pharmacy', labelKey: 'map.category.pharmacy', icon: HeartPulse },
  { id: 'shopping', labelKey: 'map.category.shopping', icon: ShoppingBag },
  { id: 'stay', labelKey: 'map.category.stay', icon: Landmark },
  { id: 'transport', labelKey: 'map.category.transport', icon: Train },
  { id: 'airport', labelKey: 'map.category.airport', icon: Plane },
];

export const TRANSLATE_CATEGORIES: CategoryItem[] = [
  { id: 'food', labelKey: 'map.category.food', icon: Utensils },
  { id: 'cafe', labelKey: 'map.category.cafe', icon: Coffee },
  { id: 'market', labelKey: 'map.category.market', icon: Store },
  { id: 'pharmacy', labelKey: 'map.category.pharmacy', icon: HeartPulse },
  { id: 'shopping', labelKey: 'map.category.shopping', icon: ShoppingBag },
  { id: 'transport', labelKey: 'map.category.transport', icon: Train },
  { id: 'stay', labelKey: 'map.category.stay', icon: Landmark },
  { id: 'airport', labelKey: 'map.category.airport', icon: Plane },
];
