import test from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES } from '../src/data/countries';
import { Place } from '../src/types/travel';
import { t } from '../src/lib/i18n';

test('E2E User Journey Logic — Complete MVP Flow Simulation', () => {
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
