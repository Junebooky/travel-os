import { isGoogleBillingApproved } from './mapProvider';

export interface GoogleMapSessionStats {
  creationCount: number;
  sdkLoadAttempts: number;
  isSdkLoaded: boolean;
  activeInstanceId: string | null;
  isPreserved: boolean;
}

let sessionCreationCount = 0;
let sessionSdkLoadAttempts = 0;
let sessionActiveInstanceId: string | null = null;
let cachedMapInstance: unknown = null;
let cachedContainerElement: HTMLElement | null = null;

// Mock hook for headless unit & contract tests
let mockGoogleMapsApi: unknown = null;

/**
 * Returns current SPA session statistics for Google Map creation and SDK loading.
 * Note: `creationCount` tracks developer-side map instance construction in this session,
 * which is distinct from Google's server-side billable Map Load event.
 */
export function getGoogleMapSessionStats(): GoogleMapSessionStats {
  return {
    creationCount: sessionCreationCount,
    sdkLoadAttempts: sessionSdkLoadAttempts,
    isSdkLoaded: typeof window !== 'undefined' && Boolean((window as unknown as { google?: { maps?: unknown } }).google?.maps),
    activeInstanceId: sessionActiveInstanceId,
    isPreserved: cachedMapInstance !== null,
  };
}

/**
 * Resets session counters and cached instances for testing environment isolation.
 */
export function resetGoogleMapSessionForTesting(): void {
  sessionCreationCount = 0;
  sessionSdkLoadAttempts = 0;
  sessionActiveInstanceId = null;
  cachedMapInstance = null;
  cachedContainerElement = null;
  mockGoogleMapsApi = null;
}

/**
 * Allows automated tests to inject a mock google.maps object to verify
 * single-instance and tab transition contracts without live billing or network calls.
 */
export function setMockGoogleMapsForTesting(mock: unknown): void {
  mockGoogleMapsApi = mock;
}

/**
 * Resolves the client-side Google Maps API key safely.
 * Returns null if not set or whitespace.
 */
export function getClientGoogleMapsApiKey(): string | null {
  if (typeof process === 'undefined') return null;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

/**
 * Lazy loads the Google Maps JavaScript API script.
 * STRICT SECURITY/BILLING GATE:
 * - If billing is not approved (`isGoogleBillingApproved() === false`), strictly aborts with 0 network calls.
 * - If client key is missing, strictly aborts with 0 network calls.
 */
export async function loadGoogleMapsSdk(): Promise<{ success: boolean; reason?: string }> {
  // Check test mock
  if (mockGoogleMapsApi) {
    if (typeof window !== 'undefined') {
      (window as unknown as { google?: unknown }).google = mockGoogleMapsApi;
    }
    return { success: true };
  }

  // Strict billing approval gate (always checked first)
  if (!isGoogleBillingApproved()) {
    return { success: false, reason: 'unapproved_billing' };
  }

  const apiKey = getClientGoogleMapsApiKey();
  if (!apiKey) {
    return { success: false, reason: 'missing_client_key' };
  }

  if (typeof window === 'undefined') {
    return { success: false, reason: 'ssr_environment' };
  }

  // Check if already loaded
  const win = window as unknown as { google?: { maps?: unknown } };
  if (win.google?.maps) {
    return { success: true };
  }

  // Check if script tag is already attached
  const existingScript = document.querySelector('script[data-travel-os-gmaps="true"]');
  if (existingScript) {
    return new Promise((resolve) => {
      existingScript.addEventListener('load', () => resolve({ success: true }));
      existingScript.addEventListener('error', () => resolve({ success: false, reason: 'script_load_error' }));
    });
  }

  sessionSdkLoadAttempts++;

  return new Promise((resolve) => {
    try {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-travel-os-gmaps', 'true');

      script.onload = () => resolve({ success: true });
      script.onerror = () => resolve({ success: false, reason: 'network_failed' });

      document.head.appendChild(script);
    } catch {
      resolve({ success: false, reason: 'injection_exception' });
    }
  });
}

export interface MapInstanceResult {
  instance: unknown;
  isNew: boolean;
  reason?: string;
}

/**
 * Retrieves an existing Google Map instance or creates a new one only if none exists.
 * Preserves the instance across tab transitions in the SPA session.
 */
export function getOrCreateGoogleMapInstance(
  container: HTMLElement,
  options: { center: { lat: number; lng: number }; zoom: number; [key: string]: unknown }
): MapInstanceResult {
  // 1. If an instance is already cached and attached, reuse it (Single Instance guarantee)
  if (cachedMapInstance && cachedContainerElement === container) {
    return {
      instance: cachedMapInstance,
      isNew: false,
    };
  }

  // 2. Resolve Google Maps object (live SDK or test mock)
  const win = typeof window !== 'undefined' ? (window as unknown as { google?: { maps?: { Map: new (elem: HTMLElement, opts: unknown) => unknown } } }) : {};
  const mapsApi = mockGoogleMapsApi
    ? (mockGoogleMapsApi as { maps?: { Map: new (elem: HTMLElement, opts: unknown) => unknown } }).maps
    : win.google?.maps;

  if (!mapsApi || typeof mapsApi.Map !== 'function') {
    return {
      instance: null,
      isNew: false,
      reason: 'sdk_not_ready_or_unapproved',
    };
  }

  // 3. Create a brand new Google Map instance
  try {
    const newInstance = new mapsApi.Map(container, {
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false, // Custom UI controls used
      gestureHandling: 'greedy',
      ...options,
    });

    sessionCreationCount++;
    sessionActiveInstanceId = `gmap-${Date.now()}-${sessionCreationCount}`;
    cachedMapInstance = newInstance;
    cachedContainerElement = container;

    return {
      instance: newInstance,
      isNew: true,
    };
  } catch (err) {
    return {
      instance: null,
      isNew: false,
      reason: String(err),
    };
  }
}

/**
 * Triggers Google Maps container resize event without re-instantiating the map.
 * Used when switching tabs back to the map tab to ensure proper viewport sizing.
 */
export function notifyGoogleMapResize(instance: unknown): void {
  if (!instance) return;
  const win = typeof window !== 'undefined' ? (window as unknown as { google?: { maps?: { event?: { trigger: (target: unknown, event: string) => void } } } }) : {};
  const mapsEvent = mockGoogleMapsApi
    ? (mockGoogleMapsApi as { maps?: { event?: { trigger: (target: unknown, event: string) => void } } }).maps?.event
    : win.google?.maps?.event;

  if (mapsEvent && typeof mapsEvent.trigger === 'function') {
    mapsEvent.trigger(instance, 'resize');
  }
}
