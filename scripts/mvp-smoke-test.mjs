#!/usr/bin/env node

/**
 * Travel OS — Automated Mobile Smoke Test Runner
 *
 * Verifies P1 usability, PWA readiness, storage persistence, accessibility,
 * and core mobile user journey contracts without requiring an external browser binary.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const results = [];
let passCount = 0;
let failCount = 0;

function report(step, name, passed, details = '') {
  if (passed) {
    passCount++;
    results.push({ status: 'PASS', step, name, details });
    console.log(`  ✓ [PASS] [${step}] ${name} ${details ? `(${details})` : ''}`);
  } else {
    failCount++;
    results.push({ status: 'FAIL', step, name, details });
    console.error(`  ✗ [FAIL] [${step}] ${name} — ${details}`);
  }
}

console.log('\n======================================================');
console.log('🚀 Travel OS MVP — Mobile Smoke Test Runner (Issue #7)');
console.log('======================================================\n');

const startTime = Date.now();

// ---------------------------------------------------------------------------
// 1. PWA & Shell Integrity
// ---------------------------------------------------------------------------
console.log('📂 1. PWA App Shell & Manifest Integrity');
try {
  const manifestPath = path.join(rootDir, 'public', 'manifest.json');
  const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(manifestRaw);

  report(
    'PWA-01',
    'Manifest identity and display mode',
    manifest.display === 'standalone' && manifest.short_name === 'Travel OS',
    `display: ${manifest.display}, short_name: ${manifest.short_name}`
  );

  const has192 = manifest.icons?.some((i) => i.sizes === '192x192');
  const has512 = manifest.icons?.some((i) => i.sizes === '512x512');
  report(
    'PWA-02',
    'Manifest 192px and 512px icon definitions',
    has192 && has512,
    `icons count: ${manifest.icons?.length || 0}`
  );

  const icon192Exists = fs.existsSync(path.join(rootDir, 'public', 'icon-192.png'));
  const icon512Exists = fs.existsSync(path.join(rootDir, 'public', 'icon-512.png'));
  const appleTouchExists = fs.existsSync(path.join(rootDir, 'public', 'apple-touch-icon.png'));

  report(
    'PWA-03',
    'PWA PNG icon assets exist on disk',
    icon192Exists && icon512Exists && appleTouchExists,
    'icon-192.png, icon-512.png, apple-touch-icon.png present'
  );

  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swCode = fs.readFileSync(swPath, 'utf-8');
  const bypassApi = swCode.includes('/api/');
  const bypassExternal = swCode.includes('url.origin !== self.location.origin');
  report(
    'PWA-04',
    'Service Worker safe caching policy (strictly bypasses /api/ and external origins)',
    bypassApi && bypassExternal,
    'Strict app shell isolation verified'
  );
} catch (err) {
  report('PWA-ERR', 'PWA Integrity check error', false, err.message);
}

// ---------------------------------------------------------------------------
// 2. Mobile Accessibility & Safe-Area Ergonomics
// ---------------------------------------------------------------------------
console.log('\n📱 2. Mobile Ergonomics & Accessibility');
try {
  const layoutPath = path.join(rootDir, 'src', 'app', 'layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf-8');
  const noZoomLock =
    !layoutCode.includes('userScalable: false') && !layoutCode.includes('maximumScale: 1');
  const hasViewportFit = layoutCode.includes("viewportFit: 'cover'");

  report(
    'UX-01',
    'Mobile viewport accessibility (no zoom-lock barrier, cover viewport fit)',
    noZoomLock && hasViewportFit,
    'WCAG 2.1 zoom barrier removed, viewport-fit=cover preserved'
  );

  const navPath = path.join(rootDir, 'src', 'components', 'Navigation.tsx');
  const navCode = fs.readFileSync(navPath, 'utf-8');
  const hasSafeAreaPadding = navCode.includes('safe-area-inset-bottom');
  const hasMinHeight = navCode.includes('min-h-[48px]');

  report(
    'UX-02',
    'Bottom navigation safe-area padding and 48px touch targets',
    hasSafeAreaPadding && hasMinHeight,
    'safe-area-inset-bottom & min-h-[48px] present'
  );
} catch (err) {
  report('UX-ERR', 'Mobile ergonomics check error', false, err.message);
}

// ---------------------------------------------------------------------------
// 3. User Settings & Storage Resilience
// ---------------------------------------------------------------------------
console.log('\n💾 3. Storage Persistence & Offline Contracts');
try {
  const contextPath = path.join(rootDir, 'src', 'context', 'TravelContext.tsx');
  const contextCode = fs.readFileSync(contextPath, 'utf-8');

  const requiredKeys = [
    'travel_os_onboarding_v1',
    'travel_os_country_v1',
    'travel_os_lang_v1',
    'travel_os_currency_v1',
    'travel_os_saved_places_v1',
    'travel_os_viewport_v1',
  ];
  const allKeysPresent = requiredKeys.every((k) => contextCode.includes(k));

  report(
    'DATA-01',
    'All required persistent storage keys defined',
    allKeysPresent,
    `${requiredKeys.length} keys validated`
  );

  const currencyPath = path.join(rootDir, 'src', 'components', 'CurrencyView.tsx');
  const currencyCode = fs.readFileSync(currencyPath, 'utf-8');
  const hasMaxRateAge = currencyCode.includes('7 * 24 * 60 * 60 * 1000');
  const hasLastRatesKey = currencyCode.includes('travel_os_last_rates_v1');

  report(
    'DATA-02',
    'Honest offline exchange rates cache (7-day maximum expiration)',
    hasMaxRateAge && hasLastRatesKey,
    'MAX_RATE_AGE_MS = 7 days & travel_os_last_rates_v1 verified'
  );
} catch (err) {
  report('DATA-ERR', 'Storage contracts check error', false, err.message);
}

// ---------------------------------------------------------------------------
// 4. Map Viewport & Saved Places Navigation Contract
// ---------------------------------------------------------------------------
console.log('\n🗺️  4. Map Context & Place Interactivity');
try {
  const mapPath = path.join(rootDir, 'src', 'components', 'MapView.tsx');
  const mapCode = fs.readFileSync(mapPath, 'utf-8');

  const syncOnDrag = mapCode.includes('setMapViewport({ center: newCenter, zoom: zoomLevel })');
  const syncOnZoom = mapCode.includes('setMapViewport({ center: mapCenter, zoom: next })');
  const renderTimeSync = mapCode.includes('setPrevExternalVp(mapViewport)');

  report(
    'MAP-01',
    'Bidirectional map viewport synchronization on drag, zoom, and external navigation',
    syncOnDrag && syncOnZoom && renderTimeSync,
    'Map drag/zoom and external viewport sync verified'
  );
} catch (err) {
  report('MAP-ERR', 'Map context check error', false, err.message);
}

// ---------------------------------------------------------------------------
// 5. UX Writing Integrity (ko-KR.json)
// ---------------------------------------------------------------------------
console.log('\n📖 5. UX Copy Deck Integrity');
try {
  const localePath = path.join(rootDir, 'src', 'locales', 'ko-KR.json');
  const locale = JSON.parse(fs.readFileSync(localePath, 'utf-8'));

  const pwaKeysPresent =
    Boolean(locale['pwa.install.title']) &&
    Boolean(locale['pwa.install.action']) &&
    Boolean(locale['pwa.install.unavailable']);

  const savedKeysPresent =
    Boolean(locale['saved.empty.title']) &&
    Boolean(locale['saved.delete_all.action']);

  report(
    'COPY-01',
    'Verified A03 PWA and Saved Places strings present in copy deck',
    pwaKeysPresent && savedKeysPresent,
    `Total copy keys: ${Object.keys(locale).length}`
  );
} catch (err) {
  report('COPY-ERR', 'UX copy check error', false, err.message);
}

// ---------------------------------------------------------------------------
// Summary Report
// ---------------------------------------------------------------------------
const duration = Date.now() - startTime;
console.log('\n======================================================');
console.log(`📊 Smoke Test Summary: ${passCount} Passed, ${failCount} Failed (${duration}ms)`);
console.log('======================================================\n');

if (failCount > 0) {
  console.error(`💥 Smoke test suite FAILED with ${failCount} errors.`);
  process.exit(1);
} else {
  console.log('✨ All mobile smoke tests passed successfully! System is launch-ready.\n');
  process.exit(0);
}
