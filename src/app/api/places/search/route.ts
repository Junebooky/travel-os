import { NextRequest, NextResponse } from 'next/server';
import { COUNTRIES } from '@/data/countries';
import { Place, PlaceCategory } from '@/types/travel';

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

interface OsmPlaceItem {
  place_id?: number | string;
  name?: string;
  display_name: string;
  type?: string;
  lat: string;
  lon: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query')?.trim() || '';
    const category = (searchParams.get('category')?.trim() || 'all') as PlaceCategory;
    const countryCode = searchParams.get('country')?.trim() || 'JP';
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    // 1. If Google Maps API key is configured, query official Google Places API
    if (googleApiKey && query) {
      try {
        const locationParam = lat && lng ? `&location=${lat},${lng}&radius=10000` : '';
        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}${locationParam}&language=ko&key=${googleApiKey}`;

        const res = await fetch(googleUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            const places: Place[] = data.results.slice(0, 10).map((r: GooglePlaceItem, idx: number) => ({
              id: r.place_id || `google-${idx}`,
              name: r.name,
              category: category !== 'all' ? category : 'attraction',
              categoryName: r.types?.[0] || '장소',
              address: r.formatted_address || '',
              lat: r.geometry?.location?.lat || lat,
              lng: r.geometry?.location?.lng || lng,
              rating: r.rating || undefined,
              userRatingsTotal: r.user_ratings_total || undefined,
              openNow: r.opening_hours?.open_now,
              distance: '검색 위치 주변',
              description: r.formatted_address,
            }));

            return NextResponse.json({
              success: true,
              isDemo: false,
              provider: 'Google Places API',
              places,
            });
          }
        }
      } catch (err) {
        console.warn('[Places API] Google Places call error:', err);
      }
    }

    // 2. OpenStreetMap / Nominatim live geocoded search if query is provided and no Google key
    if (query && query.length >= 2) {
      try {
        const viewboxParam =
          lat && lng
            ? `&viewbox=${(lng - 0.25).toFixed(4)},${(lat + 0.25).toFixed(4)},${(lng + 0.25).toFixed(4)},${(lat - 0.25).toFixed(4)}&bounded=0`
            : '';
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}${viewboxParam}&addressdetails=1&limit=8`;

        const osmRes = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'TravelOS/1.0 (https://github.com/Junebooky/travel-os; travelos@antigravity.dev)',
            'Accept-Language': 'ko,en',
          },
        });

        if (osmRes.ok) {
          const osmData = await osmRes.json();
          if (Array.isArray(osmData) && osmData.length > 0) {
            const osmPlaces: Place[] = osmData.map((item: OsmPlaceItem, idx: number) => ({
              id: `osm-${item.place_id || idx}`,
              name: item.name || item.display_name.split(',')[0],
              category: category !== 'all' ? category : 'attraction',
              categoryName: item.type || '장소',
              address: item.display_name,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              distance: '검색 위치 주변',
              description: item.display_name,
            }));

            return NextResponse.json({
              success: true,
              isDemo: false,
              provider: 'OpenStreetMap Nominatim',
              attribution: '© OpenStreetMap contributors, ODbL 1.0',
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
      filtered = filtered.filter((p) => p.category === category);
    }

    if (query) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.address.toLowerCase().includes(query.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(query.toLowerCase()))
      );
    }

    return NextResponse.json({
      success: true,
      isDemo: true,
      provider: '추천 장소 (데모 모드)',
      demoNotice: 'Google Maps API 키가 설정되지 않아 검증된 추천 예시 장소를 표시하고 있습니다.',
      places: filtered,
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
