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
