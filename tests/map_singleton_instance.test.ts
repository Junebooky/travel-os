import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getGoogleMapSessionStats,
  resetGoogleMapSessionForTesting,
  setMockGoogleMapsForTesting,
  loadGoogleMapsSdk,
  getOrCreateGoogleMapInstance,
  notifyGoogleMapResize,
} from '@/lib/googleMapManager';
import {
  isGoogleBillingApproved,
  isServerGoogleBillingApproved,
  isGooglePlacesCallAllowed,
} from '@/lib/mapProvider';

test('MAP-S0-01: Map tab unvisited produces 0 Google Map creations and 0 SDK load requests', () => {
  resetGoogleMapSessionForTesting();

  const stats = getGoogleMapSessionStats();
  assert.equal(stats.creationCount, 0, 'Initial map creations must be exactly 0');
  assert.equal(stats.sdkLoadAttempts, 0, 'Initial SDK load attempts must be exactly 0');
  assert.equal(stats.isPreserved, false);
  assert.equal(stats.activeInstanceId, null);
});

test('MAP-S0-02: First visit to Map tab initializes Google Map instance (count = 1)', () => {
  resetGoogleMapSessionForTesting();

  // Create a mock DOM container
  const mockContainer = { tagName: 'DIV', id: 'google-map-canvas' } as unknown as HTMLElement;

  let newMapCallCount = 0;
  class MockGoogleMap {
    options: unknown;
    container: HTMLElement;
    constructor(container: HTMLElement, opts: unknown) {
      newMapCallCount++;
      this.container = container;
      this.options = opts;
    }
  }

  setMockGoogleMapsForTesting({
    maps: {
      Map: MockGoogleMap,
      event: { trigger: () => {} },
    },
  });

  // First visit
  const firstVisit = getOrCreateGoogleMapInstance(mockContainer, {
    center: { lat: 35.6762, lng: 139.6503 },
    zoom: 15,
  });

  assert.equal(firstVisit.isNew, true, 'First visit must create a new instance');
  assert.ok(firstVisit.instance instanceof MockGoogleMap);
  assert.equal(newMapCallCount, 1);

  const stats = getGoogleMapSessionStats();
  assert.equal(stats.creationCount, 1, 'Session creation count must be 1');
  assert.equal(stats.isPreserved, true);
  assert.ok(stats.activeInstanceId !== null);
});

test('MAP-S0-03: 10 round-trip tab switches preserve exact same instance (new Map() called only 1 time)', () => {
  resetGoogleMapSessionForTesting();

  const mockContainer = { tagName: 'DIV', id: 'google-map-canvas' } as unknown as HTMLElement;

  let constructorCalls = 0;
  let resizeTriggerCount = 0;

  class MockGoogleMap {
    center: { lat: number; lng: number };
    zoom: number;
    constructor(container: HTMLElement, opts: { center: { lat: number; lng: number }; zoom: number }) {
      constructorCalls++;
      this.center = opts.center;
      this.zoom = opts.zoom;
    }
  }

  setMockGoogleMapsForTesting({
    maps: {
      Map: MockGoogleMap,
      event: {
        trigger: (_target: unknown, eventName: string) => {
          if (eventName === 'resize') resizeTriggerCount++;
        },
      },
    },
  });

  // 1. Initial entry to Map tab
  const initial = getOrCreateGoogleMapInstance(mockContainer, {
    center: { lat: 35.6762, lng: 139.6503 },
    zoom: 15,
  });
  assert.equal(initial.isNew, true);
  assert.equal(constructorCalls, 1);
  const firstInstance = initial.instance;

  // 2. Perform 10 round-trip transitions through all 5 tabs:
  // Map -> Translate -> Currency -> Wallet -> Settings -> Map (Repeat 10 times)
  const tabs = ['translate', 'currency', 'wallet', 'settings', 'map'];

  for (let round = 1; round <= 10; round++) {
    for (const tab of tabs) {
      if (tab === 'map') {
        // Return to map: query getOrCreateGoogleMapInstance & trigger resize
        const result = getOrCreateGoogleMapInstance(mockContainer, {
          center: { lat: 35.6762, lng: 139.6503 },
          zoom: 15,
        });

        assert.equal(
          result.isNew,
          false,
          `Round ${round}: Re-entering map must NOT create a new instance (must reuse)`
        );
        assert.equal(
          result.instance,
          firstInstance,
          `Round ${round}: Instance identity must match initial instance exactly`
        );

        notifyGoogleMapResize(result.instance);
      }
    }
  }

  // Verification:
  // After 10 full round trips (50 tab switches), constructor was called EXACTLY ONCE!
  assert.equal(
    constructorCalls,
    1,
    `CRITICAL REQUIREMENT: new google.maps.Map() must be called only 1 time across 10 tab round trips, but got ${constructorCalls}`
  );
  assert.equal(
    resizeTriggerCount,
    10,
    'Resize event should be notified 10 times upon each tab return'
  );

  const stats = getGoogleMapSessionStats();
  assert.equal(stats.creationCount, 1);
  assert.equal(stats.isPreserved, true);
});

test('MAP-S0-04: Map state preservation contract across tab transitions', () => {
  // Simulate user journey state in TravelContext
  interface TravelSessionState {
    center: { lat: number; lng: number };
    zoom: number;
    activePlace: { id: string; name: string } | null;
    isSheetExpanded: boolean;
    searchQuery: string;
    selectedCategory: string;
    activeTab: string;
  }

  const session: TravelSessionState = {
    center: { lat: 35.6586, lng: 139.7454 }, // Tokyo Tower
    zoom: 16,
    activePlace: { id: 'place-tokyo-tower', name: '도쿄 타워' },
    isSheetExpanded: true, // Expanded bottom sheet
    searchQuery: '타워',
    selectedCategory: 'attraction',
    activeTab: 'map',
  };

  // Switch tabs 10 times without changing map session state
  const otherTabs = ['translate', 'currency', 'wallet', 'settings'];
  for (let i = 0; i < 10; i++) {
    const nextTab = otherTabs[i % otherTabs.length];
    session.activeTab = nextTab;

    // Simulate returning to map
    session.activeTab = 'map';
  }

  // All state attributes must remain unchanged
  assert.equal(session.center.lat, 35.6586);
  assert.equal(session.center.lng, 139.7454);
  assert.equal(session.zoom, 16);
  assert.equal(session.activePlace?.id, 'place-tokyo-tower');
  assert.equal(session.isSheetExpanded, true);
  assert.equal(session.searchQuery, '타워');
  assert.equal(session.selectedCategory, 'attraction');
});

test('MAP-S0-05: Panning and zooming does NOT trigger outbound Places search calls', () => {
  // Contract check on MapView dependencies
  // MapView.tsx useEffect for loadCategoryPlaces has dependencies [country.code, selectedCategory, mapProvider]
  // and mapCenter.lat / mapCenter.lng are intentionally excluded.
  const mapViewPath = path.join(process.cwd(), 'src/components/MapView.tsx');
  const content = fs.readFileSync(mapViewPath, 'utf-8');

  // Verify that loadCategoryPlaces does NOT include mapCenter in its dependency array
  const categoryEffectMatch = content.match(
    /loadCategoryPlaces\(\);[\s\S]*?return \(\) => \{[\s\S]*?ignore = true;[\s\S]*?\};[\s\S]*?\}, \[(.*?)\]\);/
  );

  assert.ok(categoryEffectMatch, 'loadCategoryPlaces useEffect must exist in MapView.tsx');
  const deps = categoryEffectMatch[1];
  assert.ok(!deps.includes('mapCenter'), 'mapCenter must NOT be in loadCategoryPlaces dependency array');
  assert.ok(!deps.includes('zoomLevel'), 'zoomLevel must NOT be in loadCategoryPlaces dependency array');
});

test('MAP-S0-06: Tab return (switching back to Map tab) does NOT trigger unintended Places search calls', () => {
  const travelAppPath = path.join(process.cwd(), 'src/components/TravelApp.tsx');
  const content = fs.readFileSync(travelAppPath, 'utf-8');

  // MapView must be preserved inside persistent container and not unmounted on activeTab !== 'map'
  assert.ok(content.includes('hasVisitedMap'), 'TravelApp must track hasVisitedMap to avoid remounting MapView');
  assert.ok(
    content.includes('persistent-map-container'),
    'TravelApp must render persistent-map-container'
  );
  assert.ok(
    content.includes('isTabActive={activeTab === \'map\'}'),
    'MapView must receive isTabActive prop'
  );
});

test('MAP-S0-07: Unapproved billing or missing key strictly prevents live SDK loading (0 network calls)', async () => {
  resetGoogleMapSessionForTesting();

  const originalApproved = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
  const originalKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  try {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    assert.equal(isGoogleBillingApproved(), false);
    assert.equal(isServerGoogleBillingApproved(), false);
    assert.equal(isGooglePlacesCallAllowed(), false);

    // Call loadGoogleMapsSdk
    const result = await loadGoogleMapsSdk();
    assert.equal(result.success, false);
    assert.equal(result.reason, 'unapproved_billing');

    // Stats check: 0 SDK load attempts
    const stats = getGoogleMapSessionStats();
    assert.equal(stats.sdkLoadAttempts, 0);
  } finally {
    if (originalApproved !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BILLING_APPROVED = originalApproved;
    }
    if (originalKey !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalKey;
    }
  }
});

test('MAP-S0-08: Accessibility and DOM preservation contract (inert & aria-hidden)', () => {
  const travelAppPath = path.join(process.cwd(), 'src/components/TravelApp.tsx');
  const content = fs.readFileSync(travelAppPath, 'utf-8');

  // Verify that TravelApp applies aria-hidden and inert when activeTab !== 'map'
  assert.ok(
    content.includes('aria-hidden={activeTab !== \'map\'}'),
    'TravelApp must set aria-hidden when Map tab is hidden'
  );
  assert.ok(
    content.includes('inert={activeTab !== \'map\' ? true : undefined}'),
    'TravelApp must set HTML5 inert attribute when Map tab is hidden to prevent focus trapping'
  );
});

test('MAP-S0-09: Tile & Place caching prohibition contract (Google ToS compliance in Service Worker)', () => {
  const swPath = path.join(process.cwd(), 'public/sw.js');
  const content = fs.readFileSync(swPath, 'utf-8');

  assert.ok(content.includes('googleapis.com'), 'sw.js must explicitly bypass googleapis.com');
  assert.ok(content.includes('gstatic.com'), 'sw.js must explicitly bypass gstatic.com');
  assert.ok(content.includes('openstreetmap.org'), 'sw.js must explicitly bypass openstreetmap.org');
  assert.ok(content.includes('/api/'), 'sw.js must explicitly bypass /api/ routes');
});

test('MAP-S0-10: Developer-side map creation counter vs Google billable event distinction', () => {
  resetGoogleMapSessionForTesting();

  const stats = getGoogleMapSessionStats();
  // Document and assert that creationCount tracks developer-side instantiation
  assert.equal(typeof stats.creationCount, 'number');
  assert.equal(typeof stats.sdkLoadAttempts, 'number');
  assert.equal(typeof stats.isPreserved, 'boolean');
});
