import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET as getRates } from '../src/app/api/rates/route';
import { POST as postTranslate } from '../src/app/api/translate/route';

test('GET /api/rates returns valid rates object with provider and date', async () => {
  const res = await getRates();
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.provider, 'Response must have provider name');
  assert.ok(data.rateDate, 'Response must have rateDate');
  assert.equal(data.base, 'KRW', 'Base currency should be KRW');
  assert.ok(data.rates, 'Response must have rates dictionary');
  assert.ok(data.rates.JPY > 0, 'JPY rate must be positive');
  assert.ok(data.rates.USD > 0, 'USD rate must be positive');
});

test('POST /api/translate translates travel queries and provides romanization', async () => {
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
  assert.equal(data.translation, 'おすすめのメニューは何ですか？');
  assert.equal(data.targetLang, 'ja');
  assert.ok(data.romanization.includes('오스스메'), 'Romanization guide should be present');
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
