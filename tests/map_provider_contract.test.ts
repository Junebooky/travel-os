import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getPlaces } from '@/app/api/places/search/route';
import {
  getActiveMapProvider,
  isGoogleBillingApproved,
  isServerGoogleBillingApproved,
  isPlaceCompliantWithMap,
  filterCompliantPlaces,
  getServerGooglePlacesApiKey,
  isGooglePlacesCallAllowed,
} from '@/lib/mapProvider';
import { Place } from '@/types/travel';

test('MAP-P0-01: GET /api/places/search?provider=osm strictly isolates from Google Places (ToS §14 Compliance)', async () => {
  const req = {
    url: 'http://localhost:3000/api/places/search?country=JP&category=food&provider=osm',
  } as unknown as NextRequest;

  const res = await getPlaces(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.places));
  assert.ok(data.places.length > 0);

  // Must NEVER return Google Places provider when provider is OSM
  assert.notEqual(data.provider, 'Google Places API');
  assert.ok(
    data.attribution.includes('OpenStreetMap'),
    'Attribution must be OpenStreetMap when provider is osm'
  );

  // Every place returned in OSM mode must be tagged with sourceProvider: osm
  data.places.forEach((p: Place) => {
    assert.equal(
      p.sourceProvider,
      'osm',
      `Place ${p.name} must have sourceProvider 'osm' to prevent ToS §14 cross-contamination`
    );
  });
});

test('MAP-P0-02: filterCompliantPlaces prevents Google Places content from being rendered on OSM canvas', () => {
  const mockPlaces: Place[] = [
    {
      id: 'google-tokyo-tower',
      name: '도쿄 타워 (Google 데이터)',
      category: 'attraction',
      address: 'Tokyo, Minato City',
      lat: 35.6586,
      lng: 139.7454,
      sourceProvider: 'google',
    },
    {
      id: 'osm-sensoji',
      name: '센소지 (OSM 데이터)',
      category: 'attraction',
      address: 'Tokyo, Taito City',
      lat: 35.7148,
      lng: 139.7967,
      sourceProvider: 'osm',
    },
  ];

  // 1. On OSM map canvas: Google places must be filtered out
  const osmCompliant = filterCompliantPlaces(mockPlaces, 'osm');
  assert.equal(osmCompliant.length, 1);
  assert.equal(osmCompliant[0].id, 'osm-sensoji');
  assert.equal(isPlaceCompliantWithMap(mockPlaces[0], 'osm'), false);
  assert.equal(isPlaceCompliantWithMap(mockPlaces[1], 'osm'), true);

  // 2. On Google map canvas: All places are compliant
  const googleCompliant = filterCompliantPlaces(mockPlaces, 'google');
  assert.equal(googleCompliant.length, 2);
  assert.equal(isPlaceCompliantWithMap(mockPlaces[0], 'google'), true);
  assert.equal(isPlaceCompliantWithMap(mockPlaces[1], 'google'), true);
});

test('MAP-P0-03: Billing Gate Contract — Unapproved billing prevents live paid Google SDK execution', () => {
  const originalClient = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
  const originalServer = process.env.GOOGLE_MAPS_BILLING_APPROVED;
  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
    delete process.env.GOOGLE_MAPS_BILLING_APPROVED;

    assert.equal(isGoogleBillingApproved(), false);
    assert.equal(isServerGoogleBillingApproved(), false);

    // Client-only flag must NOT authorize server-side billing
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = 'true';
    assert.equal(isGoogleBillingApproved(), true);
    assert.equal(
      isServerGoogleBillingApproved(),
      false,
      'Server must not authorize billing based solely on client-side NEXT_PUBLIC env'
    );

    // Server-side flag authoritatively controls backend billing
    process.env.GOOGLE_MAPS_BILLING_APPROVED = 'true';
    assert.equal(isServerGoogleBillingApproved(), true);
  } finally {
    if (originalClient !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = originalClient;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
    }
    if (originalServer !== undefined) {
      process.env.GOOGLE_MAPS_BILLING_APPROVED = originalServer;
    } else {
      delete process.env.GOOGLE_MAPS_BILLING_APPROVED;
    }
  }
});

test('MAP-P0-04: Default Provider Resolution Contract', () => {
  const originalProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  try {
    delete process.env.NEXT_PUBLIC_MAP_PROVIDER;
    assert.equal(
      getActiveMapProvider(),
      'osm',
      'Default map provider must strictly be osm to avoid accidental unapproved billing'
    );

    process.env.NEXT_PUBLIC_MAP_PROVIDER = 'google';
    assert.equal(getActiveMapProvider(), 'google');

    process.env.NEXT_PUBLIC_MAP_PROVIDER = 'osm';
    assert.equal(getActiveMapProvider(), 'osm');
  } finally {
    if (originalProvider !== undefined) {
      process.env.NEXT_PUBLIC_MAP_PROVIDER = originalProvider;
    } else {
      delete process.env.NEXT_PUBLIC_MAP_PROVIDER;
    }
  }
});

test('MAP-P0-05: GET /api/places/search?provider=google returns safe demo fallback when API key is not active', async () => {
  const req = {
    url: 'http://localhost:3000/api/places/search?country=JP&category=food&provider=google',
  } as unknown as NextRequest;

  const res = await getPlaces(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.places));
  assert.ok(data.places.length > 0);

  // When Google provider is requested, places must be tagged as google sourceProvider
  data.places.forEach((p: Place) => {
    assert.equal(p.sourceProvider, 'google');
  });
});

test('MAP-P0-06: Issue #21 Zero Outbound Calls Gate — GOOGLE_PLACES_API_KEY exists but GOOGLE_MAPS_BILLING_APPROVED !== "true" produces 0 googleapis fetch calls', async () => {
  const origKey = process.env.GOOGLE_PLACES_API_KEY;
  const origApproved = process.env.GOOGLE_MAPS_BILLING_APPROVED;
  const originalFetch = global.fetch;

  let googleFetchCallCount = 0;

  try {
    process.env.GOOGLE_PLACES_API_KEY = 'test_unapproved_secret_key_12345';
    delete process.env.GOOGLE_MAPS_BILLING_APPROVED;

    assert.equal(
      isGooglePlacesCallAllowed(),
      false,
      'isGooglePlacesCallAllowed must be false when billing approval is not set'
    );

    // Spy on global.fetch to intercept any outbound call
    global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes('googleapis.com')) {
        googleFetchCallCount++;
      }
      return originalFetch(input, init);
    }) as typeof global.fetch;

    const req = {
      url: 'http://localhost:3000/api/places/search?provider=google&query=tokyo+tower&lat=35.6586&lng=139.7454',
    } as unknown as NextRequest;

    const res = await getPlaces(req);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.isDemo, true);
    assert.ok(data.demoNotice.includes('과금 미승인') || data.demoNotice.includes('차단'));

    // AUTHORITATIVE PROOF: Outbound Google Places fetch calls MUST be EXACTLY ZERO
    assert.equal(
      googleFetchCallCount,
      0,
      `P0 VIOLATION: Expected 0 outbound calls to googleapis.com, but got ${googleFetchCallCount}`
    );
  } finally {
    global.fetch = originalFetch;
    if (origKey !== undefined) {
      process.env.GOOGLE_PLACES_API_KEY = origKey;
    } else {
      delete process.env.GOOGLE_PLACES_API_KEY;
    }
    if (origApproved !== undefined) {
      process.env.GOOGLE_MAPS_BILLING_APPROVED = origApproved;
    } else {
      delete process.env.GOOGLE_MAPS_BILLING_APPROVED;
    }
  }
});

test('MAP-P0-07: Issue #21 Key Isolation — NEXT_PUBLIC_GOOGLE_MAPS_API_KEY client key is NEVER reused for server Places calls', () => {
  const origServerKey = process.env.GOOGLE_PLACES_API_KEY;
  const origClientKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  try {
    delete process.env.GOOGLE_PLACES_API_KEY;
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'client_referrer_restricted_key';

    // Server must NOT resolve the client key
    assert.equal(getServerGooglePlacesApiKey(), null);
    assert.equal(isGooglePlacesCallAllowed(), false);
  } finally {
    if (origServerKey !== undefined) {
      process.env.GOOGLE_PLACES_API_KEY = origServerKey;
    } else {
      delete process.env.GOOGLE_PLACES_API_KEY;
    }
    if (origClientKey !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = origClientKey;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  }
});

test('MAP-P0-08: Issue #21 Direct GET query manipulation produces 0 googleapis calls without approval', async () => {
  const originalFetch = global.fetch;
  let googleFetchCount = 0;

  try {
    global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(input);
      if (urlStr.includes('googleapis.com')) {
        googleFetchCount++;
      }
      return originalFetch(input, init);
    }) as typeof global.fetch;

    // Simulate an external adversary or script probing directly with provider=google
    const req = {
      url: 'http://localhost:3000/api/places/search?provider=google&query=shinjuku&category=food&country=JP',
    } as unknown as NextRequest;

    const res = await getPlaces(req);
    assert.equal(res.status, 200);

    assert.equal(
      googleFetchCount,
      0,
      'Direct GET probe with provider=google must trigger 0 outbound Google API calls'
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('MAP-P0-09: Issue #21 Switching providers and provenance isolation — Google places never leak to OSM', () => {
  const placesWithHistory: Place[] = [
    {
      id: 'cached-google-1',
      name: 'Google Places 검색 결과 캐시',
      category: 'food',
      address: 'Tokyo',
      lat: 35.68,
      lng: 139.76,
      sourceProvider: 'google',
    },
    {
      id: 'cached-osm-1',
      name: 'OSM Nominatim 검색 결과 캐시',
      category: 'food',
      address: 'Tokyo',
      lat: 35.68,
      lng: 139.76,
      sourceProvider: 'osm',
    },
  ];

  // When switching to OSM mode, Google Places items are 100% purged from display
  const osmDisplay = filterCompliantPlaces(placesWithHistory, 'osm');
  assert.equal(osmDisplay.length, 1);
  assert.equal(osmDisplay[0].id, 'cached-osm-1');

  // Verify that individual checks reject Google items on OSM
  assert.equal(isPlaceCompliantWithMap(placesWithHistory[0], 'osm'), false);
  assert.equal(isPlaceCompliantWithMap(placesWithHistory[1], 'osm'), true);
});
