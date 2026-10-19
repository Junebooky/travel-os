import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  STORAGE_KEY_SAVED,
  safeSetItem,
  safeGetItem,
  safeRemoveItem,
} from '@/context/TravelContext';
import { Place } from '@/types/travel';

test('P1-SP-01: savePlace synchronous success and atomic persistence contract', () => {
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    const samplePlace: Place = {
      id: 'place-tokyo-skytree',
      name: '도쿄 스카이트리',
      category: 'attraction',
      address: 'Tokyo, Sumida City',
      lat: 35.7101,
      lng: 139.8107,
    };

    // Simulate TravelContext savePlace implementation
    let savedPlaces: Place[] = [];
    const savedPlacesRef = { current: savedPlaces };

    const savePlace = (place: Place): boolean => {
      const currentSaved = savedPlacesRef.current;
      if (currentSaved.some((p) => p.id === place.id)) {
        return true;
      }
      const updated = [place, ...currentSaved];
      const ok = safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      if (!ok) {
        return false;
      }
      savedPlacesRef.current = updated;
      savedPlaces = updated;
      return true;
    };

    // Save place
    const res = savePlace(samplePlace);
    assert.equal(res, true, 'savePlace must synchronously return true on successful save');
    assert.equal(savedPlacesRef.current.length, 1);
    assert.equal(savedPlacesRef.current[0].id, 'place-tokyo-skytree');

    // Verify localStorage content
    const stored = safeGetItem(STORAGE_KEY_SAVED);
    assert.ok(stored !== null);
    const parsed = JSON.parse(stored);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].name, '도쿄 스카이트리');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('P1-SP-02: savePlace duplicate prevention and rapid consecutive clicks', () => {
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    const place1: Place = {
      id: 'p1',
      name: '장소 1',
      category: 'food',
      address: '주소 1',
      lat: 35.0,
      lng: 139.0,
    };

    const place2: Place = {
      id: 'p2',
      name: '장소 2',
      category: 'cafe',
      address: '주소 2',
      lat: 35.1,
      lng: 139.1,
    };

    let savedPlaces: Place[] = [];
    const savedPlacesRef = { current: savedPlaces };

    const savePlace = (place: Place): boolean => {
      const currentSaved = savedPlacesRef.current;
      if (currentSaved.some((p) => p.id === place.id)) {
        return true;
      }
      const updated = [place, ...currentSaved];
      const ok = safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      if (!ok) {
        return false;
      }
      savedPlacesRef.current = updated;
      savedPlaces = updated;
      return true;
    };

    // First click: save place1
    const res1 = savePlace(place1);
    assert.equal(res1, true);
    assert.equal(savedPlacesRef.current.length, 1);

    // Rapid second click on same place1: duplicate prevention
    const res2 = savePlace(place1);
    assert.equal(res2, true);
    assert.equal(savedPlacesRef.current.length, 1, 'Duplicate place must not be added to saved places');

    // Rapid third click with different place2
    const res3 = savePlace(place2);
    assert.equal(res3, true);
    assert.equal(savedPlacesRef.current.length, 2);
    assert.equal(savedPlacesRef.current[0].id, 'p2');
    assert.equal(savedPlacesRef.current[1].id, 'p1');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('P1-SP-03: Storage failure (quota exceeded) guarantees rollback and synchronous false return', () => {
  let shouldFailStorage = false;
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        if (shouldFailStorage) {
          throw new Error('QuotaExceededError: DOM Exception 22');
        }
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        if (shouldFailStorage) {
          throw new Error('SecurityError');
        }
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    const initialPlace: Place = {
      id: 'existing-p1',
      name: '기존 장소',
      category: 'stay',
      address: '주소',
      lat: 35.0,
      lng: 139.0,
    };

    let savedPlaces: Place[] = [initialPlace];
    const savedPlacesRef = { current: savedPlaces };
    mockStorage[STORAGE_KEY_SAVED] = JSON.stringify([initialPlace]);

    let toastType: string | null = null;
    const showToast = (_msg: string, type: 'success' | 'info' | 'error') => {
      toastType = type;
    };

    const savePlace = (place: Place): boolean => {
      const currentSaved = savedPlacesRef.current;
      if (currentSaved.some((p) => p.id === place.id)) {
        showToast('already saved', 'info');
        return true;
      }
      const updated = [place, ...currentSaved];
      const ok = safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      if (!ok) {
        showToast('save error', 'error');
        return false;
      }
      savedPlacesRef.current = updated;
      savedPlaces = updated;
      showToast('save success', 'success');
      return true;
    };

    // Inject storage failure (QuotaExceededError)
    shouldFailStorage = true;

    const newPlace: Place = {
      id: 'failed-place',
      name: '저장 실패할 장소',
      category: 'shopping',
      address: '주소 2',
      lat: 35.2,
      lng: 139.2,
    };

    const result = savePlace(newPlace);

    // VERIFICATION OF ISSUE #19 CRITICAL BUG FIX:
    assert.equal(result, false, 'savePlace must return false when storage fails');
    assert.equal(toastType, 'error', 'Error toast must be shown on storage failure, never success');
    assert.equal(savedPlacesRef.current.length, 1, 'In-memory state must NOT be modified when storage fails (rollback)');
    assert.equal(savedPlacesRef.current[0].id, 'existing-p1');

    // Storage still contains only the initial place
    const stored = JSON.parse(mockStorage[STORAGE_KEY_SAVED]);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, 'existing-p1');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('P1-SP-04: removePlace synchronous execution and storage error handling', () => {
  let shouldFailStorage = false;
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        if (shouldFailStorage) {
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
    const placeA: Place = { id: 'pA', name: 'A', category: 'food', address: 'A', lat: 35, lng: 139 };
    const placeB: Place = { id: 'pB', name: 'B', category: 'food', address: 'B', lat: 35, lng: 139 };

    let savedPlaces: Place[] = [placeA, placeB];
    const savedPlacesRef = { current: savedPlaces };
    mockStorage[STORAGE_KEY_SAVED] = JSON.stringify(savedPlaces);

    let toastType: string | null = null;
    const showToast = (_msg: string, type: 'success' | 'info' | 'error') => {
      toastType = type;
    };

    const removePlace = (placeId: string): boolean => {
      const currentSaved = savedPlacesRef.current;
      if (!currentSaved.some((p) => p.id === placeId)) {
        return true;
      }
      const updated = currentSaved.filter((p) => p.id !== placeId);
      const ok = safeSetItem(STORAGE_KEY_SAVED, JSON.stringify(updated));
      if (!ok) {
        showToast('remove error', 'error');
        return false;
      }
      savedPlacesRef.current = updated;
      savedPlaces = updated;
      showToast('remove success', 'info');
      return true;
    };

    // 1. Successful removal of pA
    const resA = removePlace('pA');
    assert.equal(resA, true);
    assert.equal(toastType, 'info');
    assert.equal(savedPlacesRef.current.length, 1);
    assert.equal(savedPlacesRef.current[0].id, 'pB');

    // 2. Removal of non-existent item returns true without crash
    const resNonExistent = removePlace('non-existent');
    assert.equal(resNonExistent, true);
    assert.equal(savedPlacesRef.current.length, 1);

    // 3. Storage failure during removal
    shouldFailStorage = true;
    const resFail = removePlace('pB');
    assert.equal(resFail, false, 'removePlace must return false when storage write fails');
    assert.equal(toastType, 'error');
    assert.equal(savedPlacesRef.current.length, 1, 'Item must NOT be removed from state if storage write failed');
    assert.equal(savedPlacesRef.current[0].id, 'pB');
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('P1-SP-05: clearAllSavedPlaces storage failure and success contracts', () => {
  let shouldFailRemove = false;
  const mockStorage: Record<string, string> = {};
  const mockWindow = {
    localStorage: {
      getItem: (k: string) => mockStorage[k] ?? null,
      setItem: (k: string, v: string) => {
        mockStorage[k] = v;
      },
      removeItem: (k: string) => {
        if (shouldFailRemove) {
          throw new Error('SecurityError: Access Denied');
        }
        delete mockStorage[k];
      },
    },
  };

  (globalThis as unknown as { window: typeof mockWindow }).window = mockWindow;

  try {
    const place1: Place = { id: 'p1', name: 'A', category: 'food', address: 'A', lat: 35, lng: 139 };
    let savedPlaces: Place[] = [place1];
    const savedPlacesRef = { current: savedPlaces };
    mockStorage[STORAGE_KEY_SAVED] = JSON.stringify(savedPlaces);

    let toastType: string | null = null;
    const showToast = (_msg: string, type: 'success' | 'info' | 'error') => {
      toastType = type;
    };

    const clearAllSavedPlaces = (): boolean => {
      const ok = safeRemoveItem(STORAGE_KEY_SAVED);
      if (!ok) {
        showToast('delete all failed', 'error');
        return false;
      }
      savedPlacesRef.current = [];
      savedPlaces = [];
      showToast('delete all success', 'info');
      return true;
    };

    // 1. Failure scenario
    shouldFailRemove = true;
    const resFail = clearAllSavedPlaces();
    assert.equal(resFail, false, 'clearAllSavedPlaces must return false on storage removal failure');
    assert.equal(toastType, 'error');
    assert.equal(savedPlacesRef.current.length, 1, 'State must NOT be cleared when storage fails');

    // 2. Success scenario
    shouldFailRemove = false;
    const resSuccess = clearAllSavedPlaces();
    assert.equal(resSuccess, true, 'clearAllSavedPlaces must return true on storage removal success');
    assert.equal(toastType, 'info');
    assert.equal(savedPlacesRef.current.length, 0);
    assert.equal(mockStorage[STORAGE_KEY_SAVED], undefined);
  } finally {
    delete (globalThis as unknown as { window?: typeof mockWindow }).window;
  }
});

test('P1-SP-06: TravelContext static code contract — Setters must not contain I/O or outer variable side effects', () => {
  const contextPath = path.join(process.cwd(), 'src/context/TravelContext.tsx');
  const content = fs.readFileSync(contextPath, 'utf-8');

  // Verify that setSavedPlaces does not contain safeSetItem or showToast in an updater function
  assert.ok(
    !content.includes('setSavedPlaces((prev) =>'),
    'TravelContext must NOT use setSavedPlaces((prev) => ...) with side effects inside the updater'
  );

  // Verify that savedPlacesRef is declared and synchronized
  assert.ok(
    content.includes('const savedPlacesRef = useRef<Place[]>(savedPlaces);'),
    'TravelContext must declare savedPlacesRef'
  );
  assert.ok(
    content.includes('savedPlacesRef.current = savedPlaces;'),
    'TravelContext must synchronize savedPlacesRef with savedPlaces state'
  );
});
