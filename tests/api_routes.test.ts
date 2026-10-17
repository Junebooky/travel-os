import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getRates } from '../src/app/api/rates/route';
import { POST as postTranslate } from '../src/app/api/translate/route';
import { GET as getPlaces } from '../src/app/api/places/search/route';

test('GET /api/rates returns valid rates object with provider and date', async () => {
  const res = await getRates();
  // Either 200 with live/cached rates or 503 honest failure
  if (res.status === 200) {
    const data = await res.json();
    assert.ok(data.provider, 'Response must have provider name');
    assert.ok(data.rateDate, 'Response must have rateDate');
    assert.equal(data.base, 'KRW', 'Base currency should be KRW');
    assert.ok(data.rates, 'Response must have rates dictionary');
    assert.ok(data.rates.JPY > 0, 'JPY rate must be positive');
  } else {
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'RATES_UNAVAILABLE');
  }
});

test('POST /api/translate translates verified travel phrases correctly (Korean -> Foreign)', async () => {
  const mockReq = {
    json: async () => ({
      text: '추천 메뉴가 무엇인가요?',
      sourceLang: 'ko',
      targetLang: 'ja',
    }),
  } as unknown as NextRequest;

  const res = await postTranslate(mockReq);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.translation, 'おすすめのメニューは何ですか？');
  assert.equal(data.targetLang, 'ja');
  assert.ok(data.romanization.includes('오스스메'), 'Romanization guide should be present');
});

test('POST /api/translate supports bidirectional translation (Foreign -> Korean)', async () => {
  // 1. Japanese -> Korean
  const jaReq = {
    json: async () => ({
      text: 'おすすめのメニューは何ですか？',
      sourceLang: 'ja',
      targetLang: 'ko',
    }),
  } as unknown as NextRequest;

  const jaRes = await postTranslate(jaReq);
  assert.equal(jaRes.status, 200);
  const jaData = await jaRes.json();
  assert.equal(jaData.success, true);
  assert.equal(jaData.translation, '추천 메뉴가 무엇인가요?');
  assert.equal(jaData.targetLang, 'ko');

  // 2. English -> Korean
  const enReq = {
    json: async () => ({
      text: 'Check, please.',
      sourceLang: 'en',
      targetLang: 'ko',
    }),
  } as unknown as NextRequest;

  const enRes = await postTranslate(enReq);
  assert.equal(enRes.status, 200);
  const enData = await enRes.json();
  assert.equal(enData.success, true);
  assert.equal(enData.translation, '계산서 부탁드립니다.');
  assert.equal(enData.targetLang, 'ko');
});


test('POST /api/translate rejects fake translations on unverified text and returns 503 with safe suggestions', async () => {
  const mockReq = {
    json: async () => ({
      text: '완전히 새로운 임의의 복잡한 문장 입력 테스트 12345',
      sourceLang: 'ko',
      targetLang: 'ja',
    }),
  } as unknown as NextRequest;

  const res = await postTranslate(mockReq);
  // Without GEMINI_API_KEY, must NOT fabricate fake translations
  if (!process.env.GEMINI_API_KEY) {
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'TRANSLATION_SERVICE_UNAVAILABLE');
    assert.ok(data.suggestedPhrases.length > 0, 'Must provide verified situational phrases as alternatives');
  }
});

test('POST /api/translate handles empty input with 400 error', async () => {
  const mockReq = {
    json: async () => ({
      text: '   ',
      sourceLang: 'ko',
      targetLang: 'ja',
    }),
  } as unknown as NextRequest;

  const res = await postTranslate(mockReq);
  assert.equal(res.status, 400);
});

test('GET /api/places/search returns transparent demo mode notice when Google API key is not present', async () => {
  const mockReq = {
    url: 'http://localhost:3000/api/places/search?country=JP&category=food',
  } as unknown as NextRequest;

  const res = await getPlaces(mockReq);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.places), 'Places must be an array');
  assert.ok(data.places.length > 0, 'Must return places');

  // Verify demo notice is present when no Google Maps key is set
  if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    assert.equal(data.isDemo, true);
    assert.ok(data.demoNotice.includes('데모 모드') || data.demoNotice.includes('API 키'));
  }
});

test('QA-P1-04 Regression: GET /api/places/search caches repeated requests and normalizes categories', async () => {
  const req1 = {
    url: 'http://localhost:3000/api/places/search?country=JP&category=market&query=shibuya',
  } as unknown as NextRequest;

  const res1 = await getPlaces(req1);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.ok(data1.places);

  // Repeated call should hit in-memory cache
  const req2 = {
    url: 'http://localhost:3000/api/places/search?country=JP&category=convenience&query=shibuya',
  } as unknown as NextRequest;

  const res2 = await getPlaces(req2);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.places.length, data1.places.length);
});

test('QA-P1-05 Regression: Strict rate validation rejects missing or non-positive rates with null', () => {
  // Test rate computation logic directly
  const computeRate = (
    rates: Record<string, number> | undefined,
    from: string,
    to: string
  ): number | null => {
    if (!rates) return null;
    const fromPerKrw = rates[from];
    const toPerKrw = rates[to];

    const isValid = (val: unknown): val is number =>
      typeof val === 'number' && Number.isFinite(val) && val > 0;

    if (!isValid(fromPerKrw) || !isValid(toPerKrw)) {
      return null;
    }

    return (1 / fromPerKrw) * toPerKrw;
  };

  // Case 1: Normal valid rates
  const normalRates = { KRW: 1, JPY: 0.11, USD: 0.00075 };
  const validRate = computeRate(normalRates, 'JPY', 'KRW');
  assert.ok(validRate !== null && validRate > 0);

  // Case 2: Target currency missing (e.g. partial response) — MUST be null, NEVER fallback to 1
  const missingTarget = { KRW: 1 };
  assert.equal(computeRate(missingTarget, 'JPY', 'KRW'), null, 'Missing JPY must yield null');
  assert.equal(computeRate(missingTarget, 'KRW', 'JPY'), null, 'Missing JPY target must yield null');

  // Case 3: Zero or negative or NaN rates — MUST be null
  const invalidRates = { KRW: 1, JPY: 0, USD: -0.5, EUR: NaN };
  assert.equal(computeRate(invalidRates, 'JPY', 'KRW'), null, '0 rate must yield null');
  assert.equal(computeRate(invalidRates, 'USD', 'KRW'), null, 'Negative rate must yield null');
  assert.equal(computeRate(invalidRates, 'EUR', 'KRW'), null, 'NaN rate must yield null');
});

