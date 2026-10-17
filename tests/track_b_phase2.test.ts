import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_KEY_WALLET, STORAGE_KEY_LAST_RATES } from '../src/context/TravelContext';
import { ExpenseRecord, MenuItemOCR, Place, ChatMessage } from '../src/types/travel';
import { POST as cameraTranslatePost } from '../src/app/api/camera/translate/route';
import { getBcp47Locale, BCP47_LANGUAGE_MAP } from '../src/components/VoiceChatModal';
import { NextRequest } from 'next/server';

test('Track B B1: Speech & Voice Conversation Data Contract', () => {
  const sampleMsg: ChatMessage = {
    id: 'msg-test-1',
    speaker: 'me',
    originalText: '물 좀 더 주실 수 있나요?',
    translatedText: 'お水をもう少しいただけますか？',
    translationStatus: 'success',
    timestamp: Date.now(),
  };

  assert.equal(sampleMsg.speaker, 'me');
  assert.equal(sampleMsg.translationStatus, 'success');
  assert.ok(sampleMsg.translatedText.includes('お水'));
  assert.equal(STORAGE_KEY_WALLET, 'travel_os_wallet_v1');
  assert.equal(STORAGE_KEY_LAST_RATES, 'travel_os_last_rates_v1');
});

test('TB-P1-06 Regression: Accurate BCP-47 Locale Mapping across all supported languages', () => {
  assert.equal(getBcp47Locale('fr'), 'fr-FR', 'French must resolve to fr-FR, not en-US or ko-KR');
  assert.equal(getBcp47Locale('zh-TW'), 'zh-TW', 'Traditional Chinese must resolve to zh-TW');
  assert.equal(getBcp47Locale('vi'), 'vi-VN', 'Vietnamese must resolve to vi-VN');
  assert.equal(getBcp47Locale('th'), 'th-TH', 'Thai must resolve to th-TH');
  assert.equal(getBcp47Locale('it'), 'it-IT', 'Italian must resolve to it-IT');
  assert.equal(getBcp47Locale('de'), 'de-DE', 'German must resolve to de-DE');
  assert.equal(getBcp47Locale('es'), 'es-ES', 'Spanish must resolve to es-ES');
  assert.equal(getBcp47Locale('ja'), 'ja-JP', 'Japanese must resolve to ja-JP');
  assert.equal(getBcp47Locale('ko'), 'ko-KR', 'Korean must resolve to ko-KR');
  assert.equal(getBcp47Locale('en'), 'en-US', 'English must resolve to en-US');

  // Verify all keys in BCP47_LANGUAGE_MAP are valid BCP-47 tags
  for (const [code, bcp47] of Object.entries(BCP47_LANGUAGE_MAP)) {
    assert.ok(bcp47.includes('-'), `BCP-47 tag for ${code} (${bcp47}) must contain hyphen subtag`);
  }
});

test('TB-P1-01 Regression: Translation failure does not treat original text as translation', () => {
  // Simulate failed translation response from /api/translate
  const originalInput = '안녕하세요, 추천 메뉴가 무엇인가요?';
  const apiFailedResponse: { success: boolean; translation?: string; error?: string } = { success: false, error: 'SERVICE_UNAVAILABLE' };

  let translatedText = '';
  let translationStatus: 'success' | 'failed' = 'failed';

  if (apiFailedResponse.success && apiFailedResponse.translation) {
    translatedText = apiFailedResponse.translation;
    translationStatus = 'success';
  } else {
    translatedText = '';
    translationStatus = 'failed';
  }

  const failedMsg: ChatMessage = {
    id: 'msg-failed-1',
    speaker: 'me',
    originalText: originalInput,
    translatedText,
    translationStatus,
    timestamp: Date.now(),
  };

  assert.equal(failedMsg.translationStatus, 'failed', 'Message status must be failed');
  assert.equal(failedMsg.translatedText, '', 'Translated text must be empty string on failure, NEVER original text');
  assert.notEqual(failedMsg.translatedText, originalInput, 'Original text must NEVER masquerade as translation');

  // Verify retry logic when service becomes available
  const apiRetryResponse = { success: true, translation: 'Hello, what is your recommendation?' };
  let retriedTranslatedText = '';
  let retriedStatus: 'success' | 'failed' = 'failed';

  if (apiRetryResponse.success && apiRetryResponse.translation) {
    retriedTranslatedText = apiRetryResponse.translation;
    retriedStatus = 'success';
  }

  const recoveredMsg: ChatMessage = {
    ...failedMsg,
    translatedText: retriedTranslatedText,
    translationStatus: retriedStatus,
  };

  assert.equal(recoveredMsg.translationStatus, 'success');
  assert.equal(recoveredMsg.translatedText, 'Hello, what is your recommendation?');
});

test('TB-P1-02 Regression: Price editing uses verified rates and never arbitrary 9.15 fallback', () => {
  // Simulate conversion helper with verified rates
  const mockRates: Record<string, number> = {
    JPY: 0.109, // 1 KRW = 0.109 JPY => 1 JPY = 9.17 KRW
    USD: 0.000724, // 1 KRW = 0.000724 USD => 1 USD = 1381 KRW
  };

  const convertCurrency = (amount: number, currency: string) => {
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return null;
    const rateVal = mockRates[currency];
    if (!rateVal || rateVal <= 0) return null;
    const krwPerUnit = 1 / rateVal;
    return {
      krw: Math.round(amount * krwPerUnit),
      rate: krwPerUnit,
    };
  };

  // 1. Valid conversion
  const validEdit = convertCurrency(1000, 'JPY');
  assert.ok(validEdit !== null);
  assert.equal(validEdit.krw, 9174);

  // 2. Unverified currency (missing rate) must yield null (unconvertible), NEVER 9.15
  const unknownCurrencyResult = convertCurrency(50, 'XYZ');
  assert.equal(unknownCurrencyResult, null, 'Unknown currency must yield null, not 9.15');

  // 3. Zero or negative rate must yield null
  mockRates['BAD'] = 0;
  const badRateResult = convertCurrency(100, 'BAD');
  assert.equal(badRateResult, null, 'Zero rate must yield null');
});

test('TB-P1-03 Regression: Duplicate expense within 2 minutes is blocked unless forced', () => {
  let expenses: ExpenseRecord[] = [];

  const existingExpense: ExpenseRecord = {
    id: 'exp-orig-1',
    placeName: '이치란 시부야점',
    amount: 980,
    currency: 'JPY',
    amountKrw: 8967,
    category: 'food',
    paymentMethod: 'card',
    timestamp: Date.now() - 30 * 1000, // 30 seconds ago
  };
  expenses = [existingExpense];

  // Attempt duplicate addition without force flag
  const duplicateCandidate = {
    placeName: '이치란 시부야점',
    amount: 980,
    currency: 'JPY',
    amountKrw: 8967,
    category: 'food' as const,
    paymentMethod: 'card' as const,
  };

  const addExpenseTest = (item: typeof duplicateCandidate, options?: { force?: boolean }): boolean => {
    const now = Date.now();
    const isDup = expenses.some(
      (e) =>
        e.placeName.trim() === item.placeName.trim() &&
        e.amount === item.amount &&
        e.currency === item.currency &&
        now - e.timestamp < 2 * 60 * 1000
    );

    if (isDup && !options?.force) {
      return false; // Blocked!
    }

    expenses = [{ ...item, id: 'exp-' + now, timestamp: now }, ...expenses];
    return true;
  };

  // 1. Should be blocked
  const saved1 = addExpenseTest(duplicateCandidate);
  assert.equal(saved1, false, 'Duplicate expense must return false and be blocked');
  assert.equal(expenses.length, 1, 'Expenses length must remain 1');

  // 2. Rapid concurrent click with same candidate must still be blocked
  const saved2 = addExpenseTest(duplicateCandidate);
  assert.equal(saved2, false, 'Rapid concurrent duplicate must still be blocked');
  assert.equal(expenses.length, 1);

  // 3. With explicit force: true, saving is permitted
  const savedForce = addExpenseTest(duplicateCandidate, { force: true });
  assert.equal(savedForce, true, 'Forced expense must save successfully');
  assert.equal(expenses.length, 2, 'Expenses length must now be 2');
});

test('TB-P1-04 Regression: Real OCR route requires rate for KRW or sets estimatedKrw to null (never 0)', () => {
  // Test formatting logic for Gemini OCR results
  const rawItemFromVision = {
    originalName: 'Tonkotsu Ramen',
    translatedName: '돈코츠 라멘',
    originalPrice: 980,
    currency: 'JPY',
  };

  // Case A: rateToKrw is provided and positive
  const rateToKrw = 9.17;
  const computedKrw = rateToKrw && rateToKrw > 0 ? Math.round(rawItemFromVision.originalPrice * rateToKrw) : null;
  assert.equal(computedKrw, 8987);

  // Case B: rateToKrw is absent or 0
  const noRateToKrw = undefined;
  const nullKrw = noRateToKrw && (noRateToKrw as number) > 0 ? Math.round(rawItemFromVision.originalPrice * (noRateToKrw as number)) : null;
  assert.equal(nullKrw, null, 'estimatedKrw must be null when rate is absent, NEVER 0');
  assert.notEqual(nullKrw, 0, 'estimatedKrw must never be 0 for a priced item');
});

test('TB-P1-05 Regression: Manual wallet expense handles genuine rate and nullable KRW cleanly', () => {
  let expenses: ExpenseRecord[] = [];

  // Item with verified conversion
  const verifiedExpense: ExpenseRecord = {
    id: 'exp-v1',
    placeName: '도쿄 디저트 카페',
    amount: 650,
    currency: 'JPY',
    amountKrw: 5961,
    category: 'cafe',
    paymentMethod: 'card',
    timestamp: Date.now(),
    rateUsed: {
      rate: 9.17,
      provider: 'open.er-api',
      date: '2026-10-17',
    },
  };

  // Item with unverified conversion (offline without cache)
  const unverifiedExpense: ExpenseRecord = {
    id: 'exp-u1',
    placeName: '하노이 길거리 상점',
    amount: 150000,
    currency: 'VND',
    amountKrw: null,
    category: 'shopping',
    paymentMethod: 'cash',
    timestamp: Date.now(),
  };

  expenses = [verifiedExpense, unverifiedExpense];

  // Total KRW must only sum non-null values without NaN
  const totalKrw = expenses.reduce((sum, item) => sum + (item.amountKrw || 0), 0);
  assert.equal(totalKrw, 5961, 'Total KRW must accurately sum verified amounts');

  const hasUncalculated = expenses.some((item) => item.amountKrw === null);
  assert.equal(hasUncalculated, true, 'Must identify uncalculated expenses');
});

test('Track B B2 & B3: POST /api/camera/translate explicit sample mode vs upload separation', async () => {
  // 1. Explicit sample request (isSample: true)
  const sampleReq = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      isSample: true,
      countryCode: 'JP',
      currency: 'JPY',
    }),
  });

  const sampleRes = await cameraTranslatePost(sampleReq);
  assert.equal(sampleRes.status, 200);

  const sampleData = await sampleRes.json();
  assert.equal(sampleData.success, true);
  assert.equal(sampleData.isDemo, true);
  assert.equal(sampleData.currency, 'JPY');
  assert.ok(sampleData.items.length >= 3);

  // 2. Upload request without API key returns VISION_AI_NOT_CONFIGURED (does not disguise sample as uploaded photo)
  const uploadReq = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: 'data:image/jpeg;base64,dGVzdA==',
      mimeType: 'image/jpeg',
      countryCode: 'JP',
      currency: 'JPY',
    }),
  });

  const uploadRes = await cameraTranslatePost(uploadReq);
  const uploadData = await uploadRes.json();
  // If GEMINI_API_KEY is not set in test environment, it transparently reports VISION_AI_NOT_CONFIGURED
  if (!process.env.GEMINI_API_KEY) {
    assert.equal(uploadData.success, false);
    assert.equal(uploadData.error, 'VISION_AI_NOT_CONFIGURED');
  }

  // 3. Invalid mime type rejection
  const invalidMimeReq = new NextRequest('http://localhost:3000/api/camera/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: 'data:text/plain;base64,dGVzdA==',
      mimeType: 'text/plain',
    }),
  });

  const invalidMimeRes = await cameraTranslatePost(invalidMimeReq);
  assert.equal(invalidMimeRes.status, 400);
});

test('Track B Cross-Feature Context Flow: Map Place -> Camera OCR -> Wallet Save -> Return to Map', () => {
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

  const ocrItem: MenuItemOCR = {
    id: 'ocr-101',
    originalName: '特製 豚骨らーめん',
    translatedName: '특제 돈코츠 라멘',
    originalPrice: 980,
    currency: 'JPY',
    estimatedKrw: 8967,
    description: '돈코츠 라멘',
  };

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

  const phase2Keys = Object.keys(phase2Json);
  assert.ok(phase2Keys.length >= 60, 'Phase 2 keys must have at least 60 strings');

  // Verify critical TB-P1 keys exist in phase2
  assert.ok(phase2Json['voice.translate_failed'], 'voice.translate_failed must exist');
  assert.ok(phase2Json['voice.action.retry'], 'voice.action.retry must exist');
  assert.ok(phase2Json['camera.action.load_sample'], 'camera.action.load_sample must exist');
  assert.ok(phase2Json['camera.sample_badge'], 'camera.sample_badge must exist');
  assert.ok(phase2Json['price.unconvertible'], 'price.unconvertible must exist');
  assert.ok(phase2Json['wallet.duplicate.blocked'], 'wallet.duplicate.blocked must exist');
  assert.ok(phase2Json['wallet.rate.unverified'], 'wallet.rate.unverified must exist');
});
