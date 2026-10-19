import { MapProvider, Place } from '@/types/travel';

/**
 * Returns the currently active Map Provider from configuration.
 * Defaults strictly to 'osm' (OpenStreetMap) to prevent unapproved Google billing.
 */
export function getActiveMapProvider(): MapProvider {
  const envVal = process.env.NEXT_PUBLIC_MAP_PROVIDER?.trim().toLowerCase();
  if (envVal === 'google') {
    return 'google';
  }
  return 'osm';
}

/**
 * Client-side check for UI indicator.
 * Strictly used for display/mock banners in the browser.
 */
export function isGoogleBillingApproved(): boolean {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED === 'true';
}

/**
 * Server-side authoritative billing approval check.
 * Strictly checks the private server environment variable GOOGLE_MAPS_BILLING_APPROVED.
 * Does NOT trust client-side or NEXT_PUBLIC_* variables for authorizing backend outbound billing calls.
 */
export function isServerGoogleBillingApproved(): boolean {
  return process.env.GOOGLE_MAPS_BILLING_APPROVED === 'true';
}

/**
 * Server-side Places API Key resolver.
 * Strictly requires the dedicated server secret GOOGLE_PLACES_API_KEY.
 * NEVER falls back to NEXT_PUBLIC_* client keys, ensuring strict separation of keys.
 */
export function getServerGooglePlacesApiKey(): string | null {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return key || null;
}

/**
 * Authoritative gate for outbound Google Places API network calls.
 * Both conditions MUST be met:
 * 1. Owner has explicitly approved billing (GOOGLE_MAPS_BILLING_APPROVED === 'true')
 * 2. Dedicated server key (GOOGLE_PLACES_API_KEY) is configured
 */
export function isGooglePlacesCallAllowed(): boolean {
  return isServerGoogleBillingApproved() && Boolean(getServerGooglePlacesApiKey());
}

/**
 * Validates Google Maps Platform Service Terms §14 compliance:
 * "Customer will not display Places Content on a non-Google map."
 *
 * If the current map canvas is 'osm', places retrieved from 'google'
 * MUST NOT be rendered on the OSM map canvas.
 */
export function isPlaceCompliantWithMap(
  place: Place,
  activeMapProvider: MapProvider
): boolean {
  // If place specifically came from Google Places, it cannot be rendered on non-Google maps
  if (activeMapProvider === 'osm' && place.sourceProvider === 'google') {
    return false;
  }
  return true;
}

/**
 * Filters a list of places to ensure 100% Google ToS §14 compliance.
 */
export function filterCompliantPlaces(
  places: Place[],
  activeMapProvider: MapProvider
): Place[] {
  return places.filter((p) => isPlaceCompliantWithMap(p, activeMapProvider));
}
