import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { t, formatCurrency, formatNumber, formatDate } from '../src/lib/i18n';
import { MAP_CATEGORIES, TRANSLATE_CATEGORIES, getCategoryLabelKey, normalizeCategory } from '../src/lib/categories';

test('A03 UX Copy Deck Contract — 326 keys verification', () => {
  const jsonPath = path.resolve(__dirname, '../src/locales/ko-KR.json');
  const docsJsonPath = path.resolve(__dirname, '../docs/content/ko-KR.json');

  assert.ok(fs.existsSync(jsonPath), 'src/locales/ko-KR.json must exist');
  assert.ok(fs.existsSync(docsJsonPath), 'docs/content/ko-KR.json must exist');

  const srcData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const docsData = JSON.parse(fs.readFileSync(docsJsonPath, 'utf-8'));

  assert.equal(Object.keys(srcData).length, 326, 'Total keys in src must be exactly 326');
  assert.equal(Object.keys(docsData).length, 326, 'Total keys in docs must be exactly 326');

  // Verify category prefixes
  const expectedPrefixCounts: Record<string, number> = {
    common: 39,
    currency: 45,
    map: 51,
    onboarding: 34,
    place: 52,
    pwa: 6,
    saved: 21,
    settings: 32,
    translate: 46,
  };

  for (const [prefix, expectedCount] of Object.entries(expectedPrefixCounts)) {
    const matching = Object.keys(srcData).filter((k) => k.startsWith(prefix + '.'));
    assert.equal(
      matching.length,
      expectedCount,
      `Prefix "${prefix}" should have ${expectedCount} keys, but found ${matching.length}`
    );
  }
});

test('Interpolation engine replaces named variables correctly', () => {
  // Onboarding progress
  const progressText = t('onboarding.progress.label', { currentStep: 2, totalSteps: 4 });
  assert.equal(progressText, '여행 설정 2/4');

  // Search results count
  const searchResults = t('map.search.results', { count: 8 });
  assert.equal(searchResults, '검색 결과 8개');

  // Place distance
  const distanceText = t('map.place.card_distance', { distance: '250m' });
  assert.equal(distanceText, '250m 떨어짐');

  // Place accessibility pin
  const pinText = t('common.accessibility.map_pin', { placeName: '이치란 시부야점' });
  assert.equal(pinText, '이치란 시부야점 장소 표시');

  // Rate as of date
  const asOfText = t('currency.result.as_of', { rateDate: '2026-10-17' });
  assert.equal(asOfText, '환율 기준: 2026-10-17');

  // Provider
  const providerText = t('currency.result.source', { providerName: 'open.er-api' });
  assert.equal(providerText, '제공: open.er-api');

  // App version
  const versionText = t('settings.about.version', { version: '1.0.0' });
  assert.equal(versionText, '버전 1.0.0');
});

test('Intl Currency, Number, and Date formatters behave accurately', () => {
  const krw = formatCurrency(15000, 'KRW');
  assert.ok(krw.includes('15,000') || krw.includes('₩'), 'KRW format should include 15,000');

  const jpy = formatCurrency(1200, 'JPY');
  assert.ok(jpy.includes('1,200') || jpy.includes('¥'), 'JPY format should include 1,200');

  const num = formatNumber(1234567.89);
  assert.ok(num.includes('1,234,567.89') || num.includes('1,234,568'));

  const dateStr = formatDate('2026-10-17T09:00:00Z');
  assert.ok(dateStr.includes('2026') && dateStr.includes('10') && dateStr.includes('17'));
});

test('i18n Contract Integrity — Every t(...) call in components must exist in src/locales/ko-KR.json or phase2-ko-KR.json', () => {
  const jsonPath = path.resolve(__dirname, '../src/locales/ko-KR.json');
  const phase2JsonPath = path.resolve(__dirname, '../src/locales/phase2-ko-KR.json');

  const baseKeys = Object.keys(JSON.parse(fs.readFileSync(jsonPath, 'utf-8')));
  const phase2Keys = fs.existsSync(phase2JsonPath)
    ? Object.keys(JSON.parse(fs.readFileSync(phase2JsonPath, 'utf-8')))
    : [];

  const validKeys = new Set([...baseKeys, ...phase2Keys]);

  const compDir = path.resolve(__dirname, '../src/components');
  const files = fs.readdirSync(compDir).filter((f) => f.endsWith('.tsx'));

  const missingCalls: Array<{ file: string; key: string }> = [];
  const regex = /\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g;

  for (const file of files) {
    const content = fs.readFileSync(path.join(compDir, file), 'utf-8');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const key = match[1];
      if (!validKeys.has(key)) {
        missingCalls.push({ file, key });
      }
    }
  }

  assert.equal(
    missingCalls.length,
    0,
    `Found ${missingCalls.length} missing t(...) calls: ${JSON.stringify(missingCalls, null, 2)}`
  );
});

test('QA-P1-01 Regression: Dynamic category keys contract in MAP_CATEGORIES and TRANSLATE_CATEGORIES', () => {
  const jsonPath = path.resolve(__dirname, '../src/locales/ko-KR.json');
  const locale = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // 1. Every MAP_CATEGORIES labelKey must exist in ko-KR.json
  for (const cat of MAP_CATEGORIES) {
    assert.ok(
      locale[cat.labelKey],
      `MAP_CATEGORIES key "${cat.labelKey}" (id: ${cat.id}) must exist in ko-KR.json`
    );
  }

  // 2. Every TRANSLATE_CATEGORIES labelKey must exist in ko-KR.json
  for (const cat of TRANSLATE_CATEGORIES) {
    assert.ok(
      locale[cat.labelKey],
      `TRANSLATE_CATEGORIES key "${cat.labelKey}" (id: ${cat.id}) must exist in ko-KR.json`
    );
  }

  // 3. Every canonical category mapped by getCategoryLabelKey must exist in ko-KR.json
  const testCategories = [
    'all', 'food', 'cafe', 'shopping', 'market', 'stay', 'pharmacy', 'airport', 'transport',
    // Legacy aliases
    'convenience', 'transit', 'attraction', 'emergency',
  ];

  for (const cat of testCategories) {
    const labelKey = getCategoryLabelKey(cat);
    assert.ok(
      locale[labelKey],
      `Category "${cat}" resolved to "${labelKey}" which must exist in ko-KR.json`
    );
    const normalized = normalizeCategory(cat);
    assert.ok(normalized, `Category "${cat}" should normalize properly`);
  }
});

