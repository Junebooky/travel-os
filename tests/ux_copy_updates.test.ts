import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { t } from '../src/lib/i18n';
import { getCurrencyDisplayName } from '../src/components/CurrencyView';

test('Issue #15 UX Copy Updates Contract — 1. 환율 계산기', () => {
  // Locale keys
  assert.equal(t('currency.from.label'), '바꿀 통화', '기준 통화 -> 바꿀 통화');
  assert.equal(t('currency.to.label'), '환산할 통화', '환산 통화 -> 환산할 통화');
  assert.equal(t('currency.input.label'), '얼마를 계산할까요?', '금액 입력 -> 얼마를 계산할까요?');
  assert.equal(t('currency.title'), '실시간 환율', '환율 -> 실시간 환율');
  assert.equal(t('currency.rate.retry'), '새로고침', '환율 다시 불러오기 -> 새로고침');
  assert.equal(t('currency.result.rate_label'), '계산에 사용한 환율', '적용 환율 -> 계산에 사용한 환율');

  // CurrencyView source code verification
  const currencyViewPath = path.resolve(__dirname, '../src/components/CurrencyView.tsx');
  const currencyViewContent = fs.readFileSync(currencyViewPath, 'utf-8');

  // 초기화 (was 지우기)
  assert.ok(currencyViewContent.includes('<span>초기화</span>'), '지우기 -> 초기화');
  assert.ok(!currencyViewContent.includes('<span>지우기</span>'), 'Old 지우기 must be removed');

  // 금액별 빠른 환산 (was 현지 주요 금액 환산표)
  assert.ok(currencyViewContent.includes('금액별 빠른 환산'), '현지 주요 금액 환산표 -> 금액별 빠른 환산');
  assert.ok(!currencyViewContent.includes('현지 주요 금액 환산표'), 'Old 현지 주요 금액 환산표 must be removed');

  // Helper check: 기준: THB → KRW -> 태국 바트 → 원화
  assert.equal(getCurrencyDisplayName('THB'), '태국 바트');
  assert.equal(getCurrencyDisplayName('KRW'), '원화');
  assert.equal(
    `${getCurrencyDisplayName('THB')} → ${getCurrencyDisplayName('KRW')}`,
    '태국 바트 → 원화'
  );

  // Date format pattern
  assert.ok(
    currencyViewContent.includes('.replace(/-/g, \'.\')} 기준'),
    '환율 기준 날짜 formatting YYYY.MM.DD 기준'
  );

  // Honest disclaimer
  assert.ok(currencyViewContent.includes('환율은 참고용이에요.'), 'Concise disclaimer line 1');
  assert.ok(
    currencyViewContent.includes('실제 결제 금액은 카드사 환율과 수수료에 따라 달라질 수 있어요.'),
    'Concise disclaimer line 2'
  );
});

test('Issue #15 UX Copy Updates Contract — 2. 지도 및 장소 검색', () => {
  // Locale keys
  assert.equal(t('map.search.placeholder'), '어디로 가볼까요?', '장소·주소 검색 -> 어디로 가볼까요?');
  assert.equal(t('map.search.button'), '찾아보기', '검색 -> 찾아보기');
  assert.equal(t('map.category.food'), '맛집', '음식점 -> 맛집');

  // MapView source code verification
  const mapViewPath = path.resolve(__dirname, '../src/components/MapView.tsx');
  const mapViewContent = fs.readFileSync(mapViewPath, 'utf-8');

  // 주변 스팟 (was 실시간 장소)
  assert.ok(mapViewContent.includes('주변 스팟'), '실시간 장소 -> 주변 스팟');

  // 주변 장소를 지도에서 확인해 보세요 (was 실시간 지도 검색 데이터 적용 완료)
  assert.ok(
    mapViewContent.includes('주변 장소를 지도에서 확인해 보세요'),
    '실시간 지도 검색 데이터 적용 완료 -> 주변 장소를 지도에서 확인해 보세요'
  );

  // 지도 미리보기 (was Google 지도 연결 전 디자인 예시)
  assert.ok(mapViewContent.includes('지도 미리보기'), 'Google 지도 연결 전 디자인 예시 -> 지도 미리보기');
  assert.ok(
    !mapViewContent.includes('Google 지도 연결 전 디자인 예시'),
    'Old Google 지도 연결 전 디자인 예시 text must be removed'
  );

  // Google 지도 (was G-Map)
  assert.ok(mapViewContent.includes("'Google 지도' : 'OSM'"), 'G-Map -> Google 지도');
  assert.ok(!mapViewContent.includes("'G-Map'"), 'Old G-Map must be removed');

  // 지도 바꾸기 (was 지도 제공자 전환)
  assert.ok(mapViewContent.includes('지도 바꾸기'), '지도 제공자 전환 -> 지도 바꾸기');
});

test('Issue #15 UX Copy Updates Contract — 3. 여행지 선택 (CountryPickerModal)', () => {
  const modalPath = path.resolve(__dirname, '../src/components/CountryPickerModal.tsx');
  const modalContent = fs.readFileSync(modalPath, 'utf-8');

  // 여행할 나라를 선택하세요 -> 새로운 여행을 시작해 볼까요?
  assert.ok(modalContent.includes('새로운 여행을 시작해 볼까요?'), 'Header title updated');
  assert.ok(!modalContent.includes('여행할 나라를 선택하세요'), 'Old title removed from modal');

  // 어디로 떠나시나요? -> 다음 여행지는 어디?
  assert.ok(modalContent.includes('다음 여행지는 어디?'), 'Header desc updated');
  assert.ok(!modalContent.includes('어디로 떠나시나요?'), 'Old desc removed from modal');

  // 국가 검색 -> 가고 싶은 나라 검색
  assert.ok(modalContent.includes('가고 싶은 나라 검색'), 'Search placeholder and label updated');
  assert.ok(!modalContent.includes('aria-label="국가 검색"'), 'Old search aria-label removed');

  // 여기로 여행갈까요? -> 이 나라로 떠나기
  assert.equal(
    t('settings.country_picker.confirm'),
    '이 나라로 떠나기',
    'settings.country_picker.confirm -> 이 나라로 떠나기'
  );

  // 닫기
  assert.ok(modalContent.includes('닫기'), 'Modal close button maintained');
});
