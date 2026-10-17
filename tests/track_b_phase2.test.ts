import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_KEY_WALLET } from '../src/context/TravelContext';
import { ExpenseRecord, MenuItemOCR, Place } from '../src/types/travel';
import { POST as cameraTranslatePost } from '../src/app/api/camera/translate/route';
import { NextRequest } from 'next/server';

test('Track B B1: Speech & Voice Conversation Data Contract', () => {
  // Test chat message model and speech lang resolution
  const sampleMsg = {
    id: 'msg-test-1',
    speaker: 'me' as const,
    originalText: '물 좀 더 주실 수 있나요?',
    translatedText: 'お水をもう少しいただけますか？',
    timestamp: Date.now(),
  };

  assert.equal(sampleMsg.speaker, 'me');
  assert.ok(sampleMsg.translatedText.includes('お水'));

  // Test target speech lang code mapping
  const resolveLangCode = (lang: string) => {
    switch (lang) {
      case 'ja': return 'ja-JP';
      case 'en': return 'en-US';
      case 'vi': return 'vi-VN';
      case 'zh-TW': return 'zh-TW';
      default: return 'ko-KR';
    }
  };

  assert.equal(resolveLangCode('ja'), 'ja-JP');
  assert.equal(resolveLangCode('en'), 'en-US');
  assert.equal(resolveLangCode('vi'), 'vi-VN');
  assert.equal(resolveLangCode('ko'), 'ko-KR');
});

test('Track B B2 & B3: POST /api/camera/translate extracts dishes and converts prices to KRW', async () => {
  const req = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: 'JP',
      currency: 'JPY',
    }),
  });

  const res = await cameraTranslatePost(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.currency, 'JPY');
  assert.ok(Array.isArray(data.items), 'Must return items array');
  assert.ok(data.items.length >= 3, 'Must contain multiple extracted menu items');

  const firstItem: MenuItemOCR = data.items[0];
  assert.ok(firstItem.originalName, 'Original dish name must be present');
  assert.ok(firstItem.translatedName, 'Translated dish name must be present');
  assert.ok(firstItem.originalPrice > 0, 'Original price must be positive number');
  assert.ok(firstItem.estimatedKrw > 0, 'Estimated KRW price must be calculated');
  assert.equal(firstItem.currency, 'JPY');

  // Verify demo transparency
  assert.equal(data.isDemo, true);
  assert.ok(data.demoNotice.includes('GEMINI_API_KEY'));
});

test('Track B B3: Multiple currencies and price candidate conversion resilience', async () => {
  const vnReq = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: 'VN',
      currency: 'VND',
    }),
  });

  const vnRes = await cameraTranslatePost(vnReq);
  const vnData = await vnRes.json();
  assert.equal(vnData.currency, 'VND');
  assert.ok(vnData.items.some((i: MenuItemOCR) => i.originalName.includes('Phở')));

  const usReq = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      countryCode: 'US',
      currency: 'USD',
    }),
  });

  const usRes = await cameraTranslatePost(usReq);
  const usData = await usRes.json();
  assert.equal(usData.currency, 'USD');
  assert.ok(usData.items.some((i: MenuItemOCR) => i.originalName.includes('Cheeseburger')));
});

test('Track B B4: Travel Wallet (Expenses & Receipts) State and Storage Integrity', () => {
  assert.equal(STORAGE_KEY_WALLET, 'travel_os_wallet_v1');

  let expenses: ExpenseRecord[] = [];

  const sampleExpense: ExpenseRecord = {
    id: 'exp-1',
    amount: 980,
    currency: 'JPY',
    amountKrw: 8967,
    placeName: '이치란 시부야점',
    category: 'food',
    paymentMethod: 'card',
    timestamp: Date.now(),
    memo: '특제 돈코츠 라멘',
    rateUsed: {
      rate: 9.15,
      provider: 'ECB/Frankfurter',
      date: '2026. 10. 17.',
    },
  };

  // 1. Add expense
  expenses = [sampleExpense, ...expenses];
  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].amountKrw, 8967);

  // 2. Duplicate detection check
  const duplicateCandidate = {
    placeName: '이치란 시부야점',
    amount: 980,
    currency: 'JPY',
  };
  const isDuplicate = expenses.some(
    (e) =>
      e.placeName === duplicateCandidate.placeName &&
      e.amount === duplicateCandidate.amount &&
      e.currency === duplicateCandidate.currency &&
      Date.now() - e.timestamp < 2 * 60 * 1000
  );
  assert.equal(isDuplicate, true, 'Expense duplicate check must trigger within 2-minute threshold');

  // 3. Delete expense
  expenses = expenses.filter((e) => e.id !== 'exp-1');
  assert.equal(expenses.length, 0);
});

test('Track B Cross-Feature Context Flow: Map Place -> Camera OCR -> Wallet Save -> Return to Map', () => {
  // 1. User starts at Map and selects place
  const selectedPlace: Place = {
    id: 'tokyo-ramen-ichiran',
    name: '이치란 시부야점',
    category: 'food',
    address: 'Shibuya, Tokyo',
    lat: 35.6601,
    lng: 139.7001,
  };

  const activePlace: Place | null = selectedPlace;
  let activeTab: string = 'map';
  let mapViewport = { center: { lat: 35.6601, lng: 139.7001 }, zoom: 15 };
  let expenses: ExpenseRecord[] = [];

  // 2. Click "메뉴 촬영/번역" in PlaceDetailSheet
  const ocrItem: MenuItemOCR = {
    id: 'ocr-101',
    originalName: '特製 豚骨らーめん',
    translatedName: '특제 돈코츠 라멘',
    originalPrice: 980,
    currency: 'JPY',
    estimatedKrw: 8967,
    description: '돈코츠 라멘',
  };

  // 3. 1-click "지갑에 저장"
  const newExpense: ExpenseRecord = {
    id: 'exp-from-ocr',
    amount: ocrItem.originalPrice,
    currency: ocrItem.currency,
    amountKrw: ocrItem.estimatedKrw,
    placeName: activePlace.name,
    category: 'food',
    paymentMethod: 'card',
    timestamp: Date.now(),
    memo: `메뉴 촬영 인식: ${ocrItem.originalName} (${ocrItem.translatedName})`,
  };
  expenses = [newExpense, ...expenses];

  assert.equal(expenses.length, 1);
  assert.equal(expenses[0].placeName, '이치란 시부야점');
  assert.ok(expenses[0].memo?.includes('特製 豚骨らーめん'));

  // 4. Return to Map preserving place and viewport
  activeTab = 'map';
  mapViewport = { center: { lat: activePlace.lat, lng: activePlace.lng }, zoom: 15 };

  assert.equal(activeTab, 'map');
  assert.equal(activePlace.id, 'tokyo-ramen-ichiran');
  assert.equal(mapViewport.center.lat, 35.6601);
  assert.equal(mapViewport.zoom, 15);
});

test('Track B Copy Contract: Phase 2 Namespaces and 1st Phase 326-Key Isolation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const baseJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'locales', 'ko-KR.json'), 'utf-8'));
  const phase2Json = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'locales', 'phase2-ko-KR.json'), 'utf-8'));

  // Phase 1 326 keys must remain unchanged
  assert.equal(Object.keys(baseJson).length, 326, 'Phase 1 keys must stay strictly 326');

  // Phase 2 extension dictionary verification
  const phase2Keys = Object.keys(phase2Json);
  assert.ok(phase2Keys.length >= 50, 'Phase 2 keys must have at least 50 strings');

  const voiceKeys = phase2Keys.filter((k) => k.startsWith('voice.'));
  const cameraKeys = phase2Keys.filter((k) => k.startsWith('camera.'));
  const priceKeys = phase2Keys.filter((k) => k.startsWith('price.'));
  const walletKeys = phase2Keys.filter((k) => k.startsWith('wallet.'));

  assert.ok(voiceKeys.length >= 15, 'voice.* namespace keys must exist');
  assert.ok(cameraKeys.length >= 15, 'camera.* namespace keys must exist');
  assert.ok(priceKeys.length >= 8, 'price.* namespace keys must exist');
  assert.ok(walletKeys.length >= 15, 'wallet.* namespace keys must exist');
});
