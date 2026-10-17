import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '../src/data/countries';
import { QUICK_PHRASES } from '../src/data/phrases';

test('Country and Places dataset integrity', () => {
  assert.ok(COUNTRIES.length >= 8, 'Must support at least 8 major travel countries');

  const requiredCountryCodes = ['JP', 'US', 'FR', 'TW', 'TH', 'VN', 'GB', 'IT'];
  for (const code of requiredCountryCodes) {
    const found = COUNTRIES.find((c) => c.code === code);
    assert.ok(found, `Country ${code} must exist in dataset`);
    assert.ok(found.name, `Country ${code} must have a name`);
    assert.ok(found.flag, `Country ${code} must have a flag`);
    assert.ok(found.defaultCenter.lat && found.defaultCenter.lng, `Country ${code} must have center coords`);
    assert.ok(found.popularPlaces.length > 0, `Country ${code} must have popular places`);

    // Verify places
    for (const place of found.popularPlaces) {
      assert.ok(place.id, 'Place must have id');
      assert.ok(place.name, 'Place must have name');
      assert.ok(place.category, 'Place must have category');
      assert.ok(place.address, 'Place must have address');
      assert.ok(typeof place.lat === 'number' && typeof place.lng === 'number', 'Place coordinates must be numbers');
    }
  }
});

test('Supported languages and currencies coverage', () => {
  assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'ko'), 'Must support Korean (ko)');
  assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'ja'), 'Must support Japanese (ja)');
  assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'en'), 'Must support English (en)');
  assert.ok(SUPPORTED_LANGUAGES.some((l) => l.code === 'fr'), 'Must support French (fr)');

  assert.ok(SUPPORTED_CURRENCIES.some((c) => c.code === 'KRW'), 'Must support KRW');
  assert.ok(SUPPORTED_CURRENCIES.some((c) => c.code === 'JPY'), 'Must support JPY');
  assert.ok(SUPPORTED_CURRENCIES.some((c) => c.code === 'USD'), 'Must support USD');
  assert.ok(SUPPORTED_CURRENCIES.some((c) => c.code === 'EUR'), 'Must support EUR');
});

test('Quick situational phrases coverage across categories', () => {
  const categories = ['food', 'cafe', 'pharmacy', 'shopping', 'market', 'transport'];

  for (const cat of categories) {
    const matching = QUICK_PHRASES.filter((p) => p.category === cat);
    assert.ok(matching.length > 0, `Category ${cat} must contain quick phrases`);

    for (const phrase of matching) {
      assert.ok(phrase.korean, 'Phrase must have Korean text');
      assert.ok(phrase.targetTranslations.ja, 'Phrase must have Japanese translation');
      assert.ok(phrase.targetTranslations.en, 'Phrase must have English translation');
    }
  }
});
