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
 * Checks whether the project owner has explicitly approved Google Maps billing.
 * Without explicit owner approval ('true'), live Google Maps JS SDK network calls
 * and billable Map Loads are strictly prevented.
 */
export function isGoogleBillingApproved(): boolean {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED === 'true' ||
    process.env.GOOGLE_MAPS_BILLING_APPROVED === 'true'
  );
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
