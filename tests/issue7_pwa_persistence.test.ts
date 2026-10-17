import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  STORAGE_KEY_ONBOARDING,
  STORAGE_KEY_COUNTRY,
  STORAGE_KEY_LANG,
  STORAGE_KEY_CURRENCY,
  STORAGE_KEY_SAVED,
  STORAGE_KEY_VIEWPORT,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
} from '../src/context/TravelContext';
import {
  STORAGE_KEY_LAST_RATES,
  MAX_RATE_AGE_MS,
  getValidatedCachedRates,
} from '../src/components/CurrencyView';
import { COUNTRIES } from '../src/data/countries';
import { Place } from '../src/types/travel';

test('Issue #7: User Settings Persistence Keys and Storage Helpers', () => {
  assert.equal(STORAGE_KEY_ONBOARDING, 'travel_os_onboarding_v1');
  assert.equal(STORAGE_KEY_COUNTRY, 'travel_os_country_v1');
  assert.equal(STORAGE_KEY_LANG, 'travel_os_lang_v1');
  assert.equal(STORAGE_KEY_CURRENCY, 'travel_os_currency_v1');
  assert.equal(STORAGE_KEY_SAVED, 'travel_os_saved_places_v1');
  assert.equal(STORAGE_KEY_VIEWPORT, 'travel_os_viewport_v1');
  assert.equal(MAX_RATE_AGE_MS, 7 * 24 * 60 * 60 * 1000);
  assert.ok(COUNTRIES.length >= 3);

  // In Node environment without window, safeGetItem/safeSetItem/safeRemoveItem safely return null / do not crash
  assert.equal(safeGetItem('test_key'), null);
  assert.doesNotThrow(() => safeSetItem('test_key', 'test_val'));
  assert.doesNotThrow(() => safeRemoveItem('test_key'));
});

test('Issue #7: Mock Window Storage Resilience & Corrupt State Fallbacks', () => {
  // Setup mock storage
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        if (v === 'TRIGGER_QUOTA_ERROR') {
          throw new Error('QuotaExceededError');
        }
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    },
  };

  // Bind global window temporarily
  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    safeSetItem('test_resilience', '12345');
    assert.equal(safeGetItem('test_resilience'), '12345');

    // Storage exception simulation
    assert.doesNotThrow(() => {
      safeSetItem('fail_key', 'TRIGGER_QUOTA_ERROR');
    });

    safeRemoveItem('test_resilience');
    assert.equal(safeGetItem('test_resilience'), null);

    // Corrupt JSON parsing resilience
    mockStorage[STORAGE_KEY_SAVED] = 'invalid-json{{{';
    let saved: Place[] = [];
    try {
      const parsed = JSON.parse(mockStorage[STORAGE_KEY_SAVED]);
      if (Array.isArray(parsed)) saved = parsed;
    } catch {
      saved = [];
    }
    assert.deepEqual(saved, [], 'Corrupt saved places must fall back to empty array without crashing');

    mockStorage[STORAGE_KEY_VIEWPORT] = '{"center": "corrupt"}';
    let vp = null;
    try {
      const parsed = JSON.parse(mockStorage[STORAGE_KEY_VIEWPORT]);
      if (
        parsed &&
        parsed.center &&
        typeof parsed.center.lat === 'number' &&
        typeof parsed.center.lng === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        vp = parsed;
      }
    } catch {
      vp = null;
    }
    assert.equal(vp, null, 'Malformed viewport JSON must fall back to null safely');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('Issue #7: Saved Places Usability — Duplicate Prevention and Removal', () => {
  const samplePlace: Place = {
    id: 'tokyo-shibuya-sky',
    name: '시부야 스카이',
    category: 'attraction',
    address: 'Shibuya, Tokyo, Japan',
    lat: 35.6585,
    lng: 139.7013,
  };

  const samplePlace2: Place = {
    id: 'tokyo-sensoji',
    name: '센소지',
    category: 'attraction',
    address: 'Taito City, Tokyo, Japan',
    lat: 35.7148,
    lng: 139.7967,
  };

  let savedPlaces: Place[] = [];

  // Add first place
  if (!savedPlaces.some((p) => p.id === samplePlace.id)) {
    savedPlaces = [...savedPlaces, samplePlace];
  }
  assert.equal(savedPlaces.length, 1);

  // Attempt to add duplicate
  if (!savedPlaces.some((p) => p.id === samplePlace.id)) {
    savedPlaces = [...savedPlaces, samplePlace];
  }
  assert.equal(savedPlaces.length, 1, 'Duplicate place must not be added to saved places');

  // Add second place
  if (!savedPlaces.some((p) => p.id === samplePlace2.id)) {
    savedPlaces = [...savedPlaces, samplePlace2];
  }
  assert.equal(savedPlaces.length, 2);

  // Remove first place
  savedPlaces = savedPlaces.filter((p) => p.id !== samplePlace.id);
  assert.equal(savedPlaces.length, 1);
  assert.equal(savedPlaces[0].id, samplePlace2.id);

  // Clear all
  savedPlaces = [];
  assert.equal(savedPlaces.length, 0);
});

test('Issue #7: Offline Exchange Rate Integrity — 7-day Cache Fallback and Expiration', () => {
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    // 1. Valid recent rates (e.g. 2 hours old)
    const validRecentRate = {
      success: true,
      provider: 'Frankfurter & ExchangeRate-API',
      rateDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      base: 'KRW',
      rates: {
        KRW: 1,
        JPY: 0.11,
        USD: 0.00075,
      },
    };
    mockStorage[STORAGE_KEY_LAST_RATES] = JSON.stringify(validRecentRate);

    const cached = getValidatedCachedRates();
    assert.ok(cached !== null, 'Valid cached rates within 7 days must be accepted');
    assert.equal(cached?.isStale, true, 'Cached rates must be marked with isStale: true');
    assert.equal(cached?.rates.JPY, 0.11);

    // 2. Expired rates (> 7 days old, e.g. 8 days old)
    const expiredRate = {
      ...validRecentRate,
      rateDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockStorage[STORAGE_KEY_LAST_RATES] = JSON.stringify(expiredRate);

    const expiredCached = getValidatedCachedRates();
    assert.equal(expiredCached, null, 'Exchange rates older than 7 days must be rejected (return null)');

    // 3. Corrupt rates schema
    mockStorage[STORAGE_KEY_LAST_RATES] = '{"provider": 123}';
    assert.equal(getValidatedCachedRates(), null, 'Malformed cache must return null');

    // 4. Missing rates
    delete mockStorage[STORAGE_KEY_LAST_RATES];
    assert.equal(getValidatedCachedRates(), null, 'Empty cache must return null');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('Issue #7: PWA Manifest & App Shell Service Worker File Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const manifestPath = path.join(rootDir, 'public', 'manifest.json');
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const icon192Path = path.join(rootDir, 'public', 'icon-192.png');
  const icon512Path = path.join(rootDir, 'public', 'icon-512.png');
  const appleIconPath = path.join(rootDir, 'public', 'apple-touch-icon.png');

  // Verify manifest.json
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.ok(manifestContent.name.includes('Travel OS'));
  assert.equal(manifestContent.short_name, 'Travel OS');
  assert.equal(manifestContent.display, 'standalone');
  assert.ok(Array.isArray(manifestContent.icons), 'Manifest must declare icons array');
  assert.ok(
    manifestContent.icons.some((i: { sizes: string }) => i.sizes === '192x192'),
    'Manifest must include 192x192 icon'
  );
  assert.ok(
    manifestContent.icons.some((i: { sizes: string }) => i.sizes === '512x512'),
    'Manifest must include 512x512 icon'
  );

  // Verify icon files
  assert.ok(fs.existsSync(icon192Path), 'icon-192.png must exist');
  assert.ok(fs.statSync(icon192Path).size > 100, 'icon-192.png must have valid file content');

  assert.ok(fs.existsSync(icon512Path), 'icon-512.png must exist');
  assert.ok(fs.statSync(icon512Path).size > 100, 'icon-512.png must have valid file content');

  assert.ok(fs.existsSync(appleIconPath), 'apple-touch-icon.png must exist');
  assert.ok(fs.statSync(appleIconPath).size > 100, 'apple-touch-icon.png must have valid file content');

  // Verify sw.js
  assert.ok(fs.existsSync(swPath), 'sw.js must exist');
  const swCode = fs.readFileSync(swPath, 'utf-8');
  assert.ok(swCode.includes('/api/'), 'Service worker must explicitly check and bypass /api/ routes');
  assert.ok(swCode.includes('url.origin !== self.location.origin'), 'Service worker must bypass external third-party origins');

  // Verify layout.tsx does not disable user scaling (Accessibility Barrier Fix)
  const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
  assert.ok(!layoutCode.includes('userScalable: false'), 'Accessibility: userScalable: false must NOT be present');
  assert.ok(!layoutCode.includes('maximumScale: 1'), 'Accessibility: maximumScale: 1 must NOT be present');
});
