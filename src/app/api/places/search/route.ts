import { NextRequest, NextResponse } from 'next/server';
import { COUNTRIES } from '@/data/countries';
import { Place, PlaceCategory } from '@/types/travel';
import { normalizeCategory } from '@/lib/categories';
import { isGooglePlacesCallAllowed, getServerGooglePlacesApiKey } from '@/lib/mapProvider';

interface GooglePlaceItem {
  place_id?: string;
  name: string;
  types?: string[];
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: { open_now?: boolean };
}

interface GooglePlaceNewItem {
  id?: string;
  displayName?: {
    text: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryTypeDisplayName?: {
    text: string;
  };
}

const GOOGLE_PLACES_NEW_TYPES: Partial<Record<PlaceCategory, string[]>> = {
  food: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  attraction: ['tourist_attraction', 'historical_landmark', 'museum', 'park', 'amusement_park'],
  stay: ['hotel', 'lodging', 'resort_hotel'],
  shopping: ['shopping_mall', 'department_store', 'clothing_store', 'supermarket', 'convenience_store'],
  market: ['supermarket', 'convenience_store', 'grocery_store'],
  convenience: ['convenience_store', 'grocery_store'],
  transport: ['train_station', 'subway_station', 'bus_station', 'transit_station'],
  transit: ['train_station', 'subway_station', 'bus_station', 'transit_station'],
  airport: ['airport'],
  pharmacy: ['pharmacy', 'drugstore', 'hospital'],
  emergency: ['hospital', 'pharmacy', 'police'],
  all: ['restaurant', 'cafe', 'tourist_attraction', 'hotel', 'shopping_mall'],
};

function mapGoogleTypeToCategory(types?: string[]): PlaceCategory {
  if (!types || !Array.isArray(types)) return 'attraction';
  if (types.some((t) => ['restaurant', 'food', 'meal_takeaway', 'bar'].includes(t))) return 'food';
  if (types.some((t) => ['cafe', 'coffee_shop', 'bakery'].includes(t))) return 'cafe';
  if (types.some((t) => ['hotel', 'lodging', 'resort_hotel'].includes(t))) return 'stay';
  if (types.some((t) => ['shopping_mall', 'store', 'supermarket', 'department_store'].includes(t))) return 'shopping';
  if (types.some((t) => ['convenience_store', 'grocery_store'].includes(t))) return 'convenience';
  if (types.some((t) => ['airport'].includes(t))) return 'airport';
  if (types.some((t) => ['subway_station', 'train_station', 'transit_station', 'bus_station'].includes(t))) return 'transport';
  if (types.some((t) => ['hospital', 'pharmacy', 'doctor', 'drugstore'].includes(t))) return 'pharmacy';
  return 'attraction';
}

interface OsmPlaceItem {
  place_id?: number | string;
  name?: string;
  display_name: string;
  type?: string;
  lat: string;
  lon: string;
}

// Server-wide rate limiter & in-memory cache complying with OSM Nominatim Acceptable Use Policy
// https://operations.osmfoundation.org/policies/nominatim/ (Max 1 request/sec, no autocomplete)
const NOMINATIM_MIN_INTERVAL_MS = 1050;
let lastNominatimCallTime = 0;

interface CacheEntry {
  timestamp: number;
  places: Place[];
}
const nominatimCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';
    const rawCategory = (searchParams.get('category')?.trim() || 'all') as PlaceCategory;
    const category = normalizeCategory(rawCategory);
    const countryCode = searchParams.get('country')?.trim() || 'JP';
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    const requestedProvider = (
      searchParams.get('provider')?.trim().toLowerCase() ||
      process.env.NEXT_PUBLIC_MAP_PROVIDER?.trim().toLowerCase() ||
      'osm'
    ) as 'google' | 'osm';

    const serverGoogleApiKey = getServerGooglePlacesApiKey();
    const isGoogleCallPermitted =
      requestedProvider === 'google' &&
      isGooglePlacesCallAllowed() &&
      Boolean(serverGoogleApiKey);

    // 1. Google Places API (New & Legacy support)
    // STRICT P0 ZERO-COST GATE: Outbound Google Places API calls are ONLY permitted when:
    // a) requestedProvider === 'google' (preventing ToS §14 violations on non-Google maps)
    // b) GOOGLE_MAPS_BILLING_APPROVED === 'true' (authoritative server-side owner approval)
    // c) GOOGLE_PLACES_API_KEY is explicitly configured (server-side secret isolation)
    if (isGoogleCallPermitted && serverGoogleApiKey) {
      try {
        // A. Primary: Google Places API (New)
        if (query) {
          const body: Record<string, unknown> = {
            textQuery: query,
            languageCode: 'ko',
          };
          if (lat && lng) {
            body.locationBias = {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: 10000.0,
              },
            };
          }
          if (category !== 'all' && GOOGLE_PLACES_NEW_TYPES[category]) {
            body.includedType = GOOGLE_PLACES_NEW_TYPES[category][0];
          }

          const resNew = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': serverGoogleApiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryTypeDisplayName',
            },
            body: JSON.stringify(body),
          });

          if (resNew.ok) {
            const dataNew = await resNew.json();
            if (dataNew && Array.isArray(dataNew.places) && dataNew.places.length > 0) {
              const places: Place[] = dataNew.places.map((p: GooglePlaceNewItem, idx: number) => ({
                id: p.id || `google-${idx}`,
                name: p.displayName?.text || '장소',
                category: category !== 'all' ? category : mapGoogleTypeToCategory(p.types),
                categoryName: p.primaryTypeDisplayName?.text || p.types?.[0] || '장소',
                address: p.formattedAddress || '',
                lat: p.location?.latitude || lat,
                lng: p.location?.longitude || lng,
                rating: p.rating,
                userRatingsTotal: p.userRatingCount,
                distance: '검색 위치 주변',
                description: p.formattedAddress,
                sourceProvider: 'google',
              }));

              return NextResponse.json({
                success: true,
                isDemo: false,
                provider: 'Google Places API',
                attribution: 'Map & Places Data © Google Maps Platform',
                places,
              });
            }
          }
        } else if (lat && lng) {
          const includedTypes =
            GOOGLE_PLACES_NEW_TYPES[category] ||
            GOOGLE_PLACES_NEW_TYPES.all ||
            ['restaurant', 'tourist_attraction', 'cafe', 'hotel'];
          const resNearby = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': serverGoogleApiKey,
              'X-Goog-FieldMask':
                'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryTypeDisplayName',
            },
            body: JSON.stringify({
              includedTypes: includedTypes.slice(0, 5),
              maxResultCount: 10,
              languageCode: 'ko',
              locationRestriction: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: 3000.0,
                },
              },
            }),
          });

          if (resNearby.ok) {
            const dataNearby = await resNearby.json();
            if (dataNearby && Array.isArray(dataNearby.places) && dataNearby.places.length > 0) {
              const places: Place[] = dataNearby.places.map((p: GooglePlaceNewItem, idx: number) => ({
                id: p.id || `google-${idx}`,
                name: p.displayName?.text || '장소',
                category: category !== 'all' ? category : mapGoogleTypeToCategory(p.types),
                categoryName: p.primaryTypeDisplayName?.text || p.types?.[0] || '장소',
                address: p.formattedAddress || '',
                lat: p.location?.latitude || lat,
                lng: p.location?.longitude || lng,
                rating: p.rating,
                userRatingsTotal: p.userRatingCount,
                distance: '검색 위치 주변',
                description: p.formattedAddress,
                sourceProvider: 'google',
              }));

              return NextResponse.json({
                success: true,
                isDemo: false,
                provider: 'Google Places API',
                attribution: 'Map & Places Data © Google Maps Platform',
                places,
              });
            }
          }
        }

        // B. Fallback: Legacy Google Places API (for legacy key configurations)
        if (query) {
          const locationParam = lat && lng ? `&location=${lat},${lng}&radius=10000` : '';
          const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
            query
          )}${locationParam}&language=ko&key=${serverGoogleApiKey}`;

          const res = await fetch(googleUrl);
          if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.results) && data.results.length > 0) {
              const places: Place[] = data.results.slice(0, 10).map((r: GooglePlaceItem, idx: number) => ({
                id: r.place_id || `google-legacy-${idx}`,
                name: r.name,
                category: category !== 'all' ? category : 'stay',
                categoryName: r.types?.[0] || '장소',
                address: r.formatted_address || '',
                lat: r.geometry?.location?.lat || lat,
                lng: r.geometry?.location?.lng || lng,
                rating: r.rating || undefined,
                userRatingsTotal: r.user_ratings_total || undefined,
                openNow: r.opening_hours?.open_now,
                distance: '검색 위치 주변',
                description: r.formatted_address,
                sourceProvider: 'google',
              }));

              return NextResponse.json({
                success: true,
                isDemo: false,
                provider: 'Google Places API',
                attribution: 'Map & Places Data © Google Maps Platform',
                places,
              });
            }
          }
        }
      } catch (err) {
        console.warn('[Places API] Google Places call error:', err);
      }
    }

    // 2. OpenStreetMap / Nominatim live geocoded search
    // Strictly used for EXPLICIT SEARCH SUBMISSIONS in OSM mode (not keystroke autocomplete)
    // Server enforces: 1req/sec global throttle, 1hr caching, and compliant User-Agent
    if (requestedProvider === 'osm' && query && query.length >= 2) {
      const cacheKey = `${query.toLowerCase()}#${category}#${countryCode}`;
      const cached = nominatimCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          isDemo: false,
          isCached: true,
          provider: 'OpenStreetMap Nominatim (서버 캐시)',
          attribution: 'Data © OpenStreetMap contributors, ODbL 1.0 (https://osm.org/copyright)',
          places: cached.places,
        });
      }

      try {
        // Enforce server-wide 1 req/sec throttle
        const elapsed = Date.now() - lastNominatimCallTime;
        if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
          await new Promise((resolve) => setTimeout(resolve, NOMINATIM_MIN_INTERVAL_MS - elapsed));
        }
        lastNominatimCallTime = Date.now();

        const viewboxParam =
          lat && lng
            ? `&viewbox=${(lng - 0.25).toFixed(4)},${(lat + 0.25).toFixed(4)},${(lng + 0.25).toFixed(4)},${(lat - 0.25).toFixed(4)}&bounded=0`
            : '';
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}${viewboxParam}&addressdetails=1&limit=8`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const osmRes = await fetch(nominatimUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'TravelOS/1.0 (https://github.com/Junebooky/travel-os; travelos-mvp@antigravity.dev)',
            'Accept-Language': 'ko,en',
          },
        });
        clearTimeout(timeoutId);

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (Array.isArray(osmData) && osmData.length > 0) {
            const osmPlaces: Place[] = osmData.map((item: OsmPlaceItem, idx: number) => ({
              id: `osm-${item.place_id || idx}`,
              name: item.name || item.display_name.split(',')[0],
              category: category !== 'all' ? category : 'stay',
              categoryName: item.type || '장소',
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              distance: '검색 위치 주변',
              description: item.display_name,
              sourceProvider: 'osm',
            }));

            // Store in server cache
            nominatimCache.set(cacheKey, {
              timestamp: Date.now(),
              places: osmPlaces,
            });

            return NextResponse.json({
              success: true,
              isDemo: false,
              provider: 'OpenStreetMap Nominatim',
              attribution: 'Data © OpenStreetMap contributors, ODbL 1.0 (https://osm.org/copyright)',
              places: osmPlaces,
            });
          }
        }
      } catch (osmErr) {
        console.warn('[Places API] OSM search fallback:', osmErr);
      }
    }

    // 3. Transparent Demo Mode: Curated sample places
    // When API key is not configured or query matches sample data,
    // explicitly notify the client that this is DEMO MODE.
    const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
    let filtered = selectedCountry.popularPlaces;

    if (category !== 'all') {
      filtered = filtered.filter((p) => normalizeCategory(p.category) === category);
    }

    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      );
    }

    const hasServerGoogleKey = Boolean(serverGoogleApiKey);
    const isGoogleMode = requestedProvider === 'google';
    const isApproved = isGooglePlacesCallAllowed();
    return NextResponse.json({
      success: true,
      isDemo: true,
      provider: isGoogleMode
        ? (isApproved && hasServerGoogleKey
            ? '추천 장소 (Google Places 연동)'
            : '추천 장소 (과금 미승인 모의)')
        : '추천 장소 (OpenStreetMap)',
      demoNotice: isGoogleMode
        ? (isApproved && hasServerGoogleKey
            ? (query ? '검색 결과가 없어 추천 장소를 표시하고 있습니다.' : 'Google Places API 연동 완료 · 추천 장소를 표시하고 있습니다.')
            : 'Google Maps 과금 미승인 · 외부 유료 API 호출이 안전하게 차단되었습니다.')
        : 'Google Maps API 키 미설정 · OpenStreetMap 실지형 타일 및 추천 데이터를 표시하고 있습니다.',
      attribution: isGoogleMode ? 'Travel OS Safe Mock (No Outbound Billable Calls)' : '© OpenStreetMap contributors',
      places: filtered.map((p) => ({ ...p, sourceProvider: isGoogleMode ? 'google' : 'osm' })),
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'digest' in error) {
      throw error;
    }
    console.error('[Places API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'PLACES_SEARCH_ERROR', message: '장소 검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
