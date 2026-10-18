import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getPlaces } from '@/app/api/places/search/route';
import {
  getActiveMapProvider,
  isGoogleBillingApproved,
  isPlaceCompliantWithMap,
  filterCompliantPlaces,
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
  // Unless explicitly set to 'true', isGoogleBillingApproved must return false
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
    delete process.env.GOOGLE_MAPS_BILLING_APPROVED;
    assert.equal(
      isGoogleBillingApproved(),
      false,
      'Billing must default to false when approval env is not present'
    );

    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = 'false';
    assert.equal(isGoogleBillingApproved(), false);

    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = 'true';
    assert.equal(isGoogleBillingApproved(), true);
  } finally {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
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
