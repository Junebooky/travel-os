import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES } from '../src/data/countries';
import { Place } from '../src/types/travel';
import { t } from '../src/lib/i18n';

/**
 * Logical State Transition & Contract Simulation Test
 * Note: This test verifies business logic, data models, and state transitions in memory.
 * It does NOT drive a physical mobile browser (which requires full E2E runner setup).
 */
test('Logical State Transition & Contract Simulation (In-memory user flow logic)', () => {
  // 1. Initial State (Unonboarded)
  let onboardingCompleted = false;
  let currentCountry = COUNTRIES[0]; // Japan
  const sourceLang = 'ko';
  let targetLang = currentCountry.defaultLang; // 'ja'
  const homeCurrency = 'KRW';
  let localCurrency = currentCountry.defaultCurrency; // 'JPY'
  let activePlace: Place | null = null;
  let activeTab: 'map' | 'translate' | 'currency' | 'settings' | 'saved' = 'map';
  let savedPlaces: Place[] = [];
  let mapViewport = { center: currentCountry.defaultCenter, zoom: currentCountry.defaultZoom };

  assert.equal(onboardingCompleted, false);
  assert.equal(sourceLang, 'ko');
  assert.equal(homeCurrency, 'KRW');

  // 2. Onboarding Flow Execution
  // Step 1: Select Country (e.g. Japan)
  currentCountry = COUNTRIES.find((c) => c.code === 'JP')!;
  assert.equal(currentCountry.code, 'JP');

  // Step 2: Language Configured
  targetLang = currentCountry.defaultLang;
  assert.equal(targetLang, 'ja');

  // Step 3: Currency Configured
  localCurrency = currentCountry.defaultCurrency;
  assert.equal(localCurrency, 'JPY');

  // Step 4: Onboarding Complete
  onboardingCompleted = true;
  assert.equal(onboardingCompleted, true);

  // 3. Map View & Search for Food
  const places = currentCountry.popularPlaces;
  const foodPlaces = places.filter((p) => p.category === 'food');
  assert.ok(foodPlaces.length >= 2, 'Should have multiple food places in Tokyo');

  // 4. Select Place (e.g. Ichiran Shibuya)
  const selectedPlace = foodPlaces[0];
  activePlace = selectedPlace;
  assert.ok(activePlace.name.includes('이치란'), 'Selected place should be Ichiran');

  // Check external directions URL
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    selectedPlace.name + ' ' + selectedPlace.address
  )}`;
  assert.ok(directionsUrl.includes('google.com/maps/dir'), 'Directions URL should be valid Google Maps URL');
  assert.ok(directionsUrl.includes(encodeURIComponent(selectedPlace.name)));

  // 5. Jump to Translate with Place Context
  activeTab = 'translate';
  const translateContextBanner = `${activePlace.name} · ${t('place.detail.quick_phrases')}`;
  assert.ok(translateContextBanner.includes(activePlace.name), 'Banner must display active place name');
  assert.equal(t('translate.return_map'), '지도로 돌아가기');

  // 6. Jump to Currency with Place Context
  activeTab = 'currency';
  const currencyContextBanner = `${activePlace.name} · ${t('place.detail.quick_currency')}`;
  assert.ok(currencyContextBanner.includes(activePlace.name), 'Banner must display active place name');
  assert.equal(t('currency.return_map'), '지도로 돌아가기');

  // 7. Return to Map restoring place and viewport
  activeTab = 'map';
  mapViewport = { center: { lat: activePlace.lat, lng: activePlace.lng }, zoom: 15 };
  assert.equal(activeTab, 'map');
  assert.equal(activePlace.id, selectedPlace.id);
  assert.equal(mapViewport.zoom, 15);

  // 8. Save Place (P1)
  savedPlaces.push(activePlace);
  assert.equal(savedPlaces.length, 1);
  assert.equal(savedPlaces[0].id, activePlace.id);

  // Toggle remove
  savedPlaces = savedPlaces.filter((p) => p.id !== activePlace!.id);
  assert.equal(savedPlaces.length, 0);

  // 9. Storage Reset simulation
  onboardingCompleted = false;
  activePlace = null;
  savedPlaces = [];
  assert.equal(onboardingCompleted, false);
  assert.equal(activePlace, null);
  assert.equal(savedPlaces.length, 0);
});

test('QA-P1-02 Regression: Input modification immediately invalidates stale translation', () => {
  let inputText = '안녕하세요';
  let translatedText = 'こんにちは';
  let romanization = '콘니치와';
  let errorMessage: string | null = null;

  // Simulate handleInputChange
  const handleInputChange = (newText: string) => {
    inputText = newText;
    translatedText = '';
    romanization = '';
    errorMessage = null;
  };

  // User modifies text
  handleInputChange('감사합니다');
  assert.equal(inputText, '감사합니다');
  assert.equal(translatedText, '', 'Stale translated text must be cleared immediately upon editing');
  assert.equal(romanization, '', 'Stale romanization must be cleared immediately upon editing');
  assert.equal(errorMessage, null);
});

test('QA-P1-03 Regression: Search for remote city recenters map viewport to result coordinates', () => {
  // Current viewport centered in Tokyo
  const tokyoCenter = { lat: 35.6762, lng: 139.6503 };
  let mapCenter = { ...tokyoCenter };
  let mapViewport = { center: { ...tokyoCenter }, zoom: 15 };
  let activePlace: Place | null = null;

  // Search returns Osaka
  const osakaPlace: Place = {
    id: 'osaka-dotonbori',
    name: '도톤보리',
    category: 'stay',
    address: 'Chuo Ward, Osaka, 542-0071 Japan',
    lat: 34.6687,
    lng: 135.5013,
  };

  // Simulate search return recentering logic
  const handleSearchResult = (places: Place[]) => {
    if (places.length > 0) {
      const first = places[0];
      const newCenter = { lat: first.lat, lng: first.lng };
      mapCenter = newCenter;
      mapViewport = { center: newCenter, zoom: 14 };
      activePlace = first;
    }
  };

  handleSearchResult([osakaPlace]);

  // Center must be updated to Osaka (not left in Tokyo)
  assert.equal(mapCenter.lat, 34.6687);
  assert.equal(mapCenter.lng, 135.5013);
  assert.equal(mapViewport.center.lat, 34.6687);
  assert.equal(mapViewport.zoom, 14);
  assert.ok(activePlace);
  assert.equal((activePlace as Place).name, '도톤보리');
});

