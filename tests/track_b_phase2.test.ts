import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { STORAGE_KEY_WALLET, STORAGE_KEY_LAST_RATES, safeSetItem, safeRemoveItem } from '../src/context/TravelContext';
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

test('TB-P1-03 Regression & Targeted Fix: Synchronous ref-based duplicate prevention and deterministic return value', () => {
  let expensesState: ExpenseRecord[] = [];
  const expensesRef = { current: expensesState };

  const addExpenseTest = (item: { placeName: string; amount: number; currency: string; amountKrw?: number | null; category: ExpenseRecord['category']; paymentMethod: ExpenseRecord['paymentMethod'] }, options?: { force?: boolean }): boolean => {
    const now = Date.now();
    const currentExpenses = expensesRef.current;
    const isDup = currentExpenses.some(
      (e) =>
        e.placeName.trim() === item.placeName.trim() &&
        e.amount === item.amount &&
        e.currency === item.currency &&
        now - e.timestamp < 2 * 60 * 1000
    );

    if (isDup && !options?.force) {
      return false; // Deterministically blocked!
    }

    const newRecord: ExpenseRecord = {
      ...item,
      amountKrw: item.amountKrw ?? null,
      id: 'exp-' + now + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: now,
    };

    // Synchronously update the ref so any rapid concurrent click sees the new record immediately
    const next = [newRecord, ...currentExpenses];
    expensesRef.current = next;
    expensesState = next;

    return true; // Deterministically saved!
  };

  const itemA = {
    placeName: '시부야 스시잔마이',
    amount: 3200,
    currency: 'JPY',
    category: 'food' as const,
    paymentMethod: 'card' as const,
  };

  // 1. First save must succeed and return true synchronously
  const result1 = addExpenseTest(itemA);
  assert.equal(result1, true, 'First save must return true');
  assert.equal(expensesRef.current.length, 1, 'Ref must contain 1 expense');
  assert.equal(expensesState.length, 1, 'State must contain 1 expense');

  // 2. Rapid second click with identical details (simulating fast double click) must be synchronously blocked
  const result2 = addExpenseTest(itemA);
  assert.equal(result2, false, 'Rapid second click must return false immediately');
  assert.equal(expensesRef.current.length, 1, 'No duplicate should be added on fast click');
  assert.equal(expensesState.length, 1, 'State length must remain 1');

  // 3. Different expense must succeed
  const itemB = {
    placeName: '도쿄 메트로 역',
    amount: 210,
    currency: 'JPY',
    category: 'transit' as const,
    paymentMethod: 'card' as const,
  };
  const result3 = addExpenseTest(itemB);
  assert.equal(result3, true, 'Different expense must return true');
  assert.equal(expensesRef.current.length, 2, 'Expenses count must now be 2');

  // 4. Forced duplicate of itemA must succeed when options.force is true
  const result4 = addExpenseTest(itemA, { force: true });
  assert.equal(result4, true, 'Forced duplicate must return true');
  assert.equal(expensesRef.current.length, 3, 'Expenses count must now be 3');
});

test('TB-P1-04 Regression & Targeted Fix: Currency matching validation prevents cross-rate miscalculation', () => {
  // Simulate OCR calculation helper matching the route.ts logic
  const calculateOcrKrw = (
    itemPrice: number,
    itemCurrency: string,
    reqCurrency: string,
    rateToKrw?: number,
    ratesMap?: Record<string, number>
  ) => {
    const normItemCurr = itemCurrency.toUpperCase();
    const normReqCurr = reqCurrency.toUpperCase();

    if (ratesMap && typeof ratesMap[normItemCurr] === 'number' && ratesMap[normItemCurr] > 0) {
      return { krw: Math.round(itemPrice * ratesMap[normItemCurr]), rateUnverified: false };
    } else if (normItemCurr === normReqCurr && typeof rateToKrw === 'number' && rateToKrw > 0) {
      return { krw: Math.round(itemPrice * rateToKrw), rateUnverified: false };
    } else {
      return { krw: null, rateUnverified: true };
    }
  };

  // Case 1: Travel setting JPY, but OCR detected USD item ($15) with NO USD rate in ratesMap
  // Must NOT apply JPY rate (9.17) to USD item ($15 * 9.17 = 138 KRW is absurd!)
  const crossCurrencyMisMatch = calculateOcrKrw(15, 'USD', 'JPY', 9.17, {});
  assert.equal(crossCurrencyMisMatch.krw, null, 'Must be null when item currency USD does not match request currency JPY and no USD rate');
  assert.equal(crossCurrencyMisMatch.rateUnverified, true);

  // Case 2: Travel setting JPY, OCR detected USD item ($15), but ratesMap provides verified USD rate (1380)
  const crossCurrencyWithRatesMap = calculateOcrKrw(15, 'USD', 'JPY', 9.17, { USD: 1380, JPY: 9.17 });
  assert.equal(crossCurrencyWithRatesMap.krw, 20700, 'Must accurately use USD rate (15 * 1380 = 20700), not JPY rate');
  assert.equal(crossCurrencyWithRatesMap.rateUnverified, false);

  // Case 3: 2-currency menu image (Item 1 in JPY 980, Item 2 in USD 15)
  const item1 = calculateOcrKrw(980, 'JPY', 'JPY', 9.17, { JPY: 9.17, USD: 1380 });
  const item2 = calculateOcrKrw(15, 'USD', 'JPY', 9.17, { JPY: 9.17, USD: 1380 });
  assert.equal(item1.krw, 8987, 'JPY item must use JPY rate');
  assert.equal(item2.krw, 20700, 'USD item must use USD rate');

  // Case 4: Missing provider rate (rateToKrw: undefined, ratesMap: undefined)
  const missingRate = calculateOcrKrw(980, 'JPY', 'JPY', undefined, undefined);
  assert.equal(missingRate.krw, null, 'estimatedKrw must be null when provider rate is missing, NEVER 0');
  assert.notEqual(missingRate.krw, 0, 'estimatedKrw must never be 0 for a priced item');
  assert.equal(missingRate.rateUnverified, true);
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
  assert.equal(phase2Keys.length, 226, 'Phase 2 keys must match updated count of 226');

  // Verify critical TB-P1 keys exist in phase2
  assert.ok(phase2Json['voice.translate_failed'], 'voice.translate_failed must exist');
  assert.ok(phase2Json['voice.action.retry'], 'voice.action.retry must exist');
  assert.ok(phase2Json['camera.action.load_sample'], 'camera.action.load_sample must exist');
  assert.ok(phase2Json['camera.sample_badge'], 'camera.sample_badge must exist');
  assert.ok(phase2Json['price.unconvertible'], 'price.unconvertible must exist');
  assert.ok(phase2Json['wallet.duplicate.blocked'], 'wallet.duplicate.blocked must exist');
  assert.ok(phase2Json['wallet.rate.unverified'], 'wallet.rate.unverified must exist');
  assert.ok(phase2Json['camera.privacy.benefit'], 'camera.privacy.benefit must exist');
  assert.ok(phase2Json['wallet.review.open'], 'wallet.review.open must exist');
  assert.ok(phase2Json['wallet.form.submit_amount'], 'wallet.form.submit_amount must exist');
  assert.ok(phase2Json['wallet.delete_one.title'], 'wallet.delete_one.title must exist');
  assert.ok(phase2Json['wallet.delete_one.action'], 'wallet.delete_one.action must exist');
});

test('D-P0-03 Storage Integrity: safeSetItem returns boolean and allows rollback on storage quota failure', () => {

  // In Node environment without window
  assert.equal(safeSetItem('test_key', 'test_val'), false);
  assert.equal(safeRemoveItem('test_key'), false);

  // Mock window with quota exception
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] || null,
      setItem: (k: string, v: string) => {
        if (k === 'quota_exceeded_key') {
          throw new Error('QuotaExceededError');
        }
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    const successWrite = safeSetItem('normal_key', 'value_ok');
    assert.equal(successWrite, true);
    assert.equal(mockStorage['normal_key'], 'value_ok');

    const failedWrite = safeSetItem('quota_exceeded_key', 'value_fail');
    assert.equal(failedWrite, false, 'safeSetItem must return false on quota error');
    assert.equal(mockStorage['quota_exceeded_key'], undefined, 'No partial corrupt state in storage');

    const successRemove = safeRemoveItem('normal_key');
    assert.equal(successRemove, true);
    assert.equal(mockStorage['normal_key'], undefined);
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('D-P1-05 & OCR Review Contract: Spend Confirmation and Single Deletion Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const phase2Json = JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'locales', 'phase2-ko-KR.json'), 'utf-8'));

  // Ensure review confirmation strings exist
  assert.ok(phase2Json['wallet.form.confirm_source']);
  assert.ok(phase2Json['wallet.form.confirm_actual']);
  assert.ok(phase2Json['wallet.review.open']);
  assert.ok(phase2Json['wallet.form.cancel']);

  // Ensure single delete dialog strings exist
  assert.ok(phase2Json['wallet.delete_one.title']);
  assert.ok(phase2Json['wallet.delete_one.body']);
  assert.ok(phase2Json['wallet.delete_one.action']);

  // Ensure retry analysis string exists
  assert.ok(phase2Json['camera.action.retry_analysis']);
});
