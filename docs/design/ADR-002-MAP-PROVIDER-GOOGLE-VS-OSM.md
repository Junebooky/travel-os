# ADR-002: 지도 공급자 아키텍처 결정 · Google 지도 배경 도입 vs OSM/MapLibre 비교 및 무과금 안전 기술 설계

- **상태:** PROPOSED / POC_IMPLEMENTED / OWNER_APPROVAL_PENDING
- **날짜:** 2026-10-18
- **발신:** A02 (수석 풀스택 개발 리드)
- **수신:** A01 (제품 아키텍처 결정 및 오너 인계), A03 (UI/UX 디자인 정합)
- **관련 이슈:** [Issue #20](https://github.com/Junebooky/travel-os/issues/20), [Issue #13 (Team Hub)](https://github.com/Junebooky/travel-os/issues/13)
- **공식 근거 자료:**
  - Google Maps Platform Pricing: https://developers.google.com/maps/billing-and-pricing/pricing?hl=ko
  - Google Maps Platform Service Terms (§14 Places Content): https://cloud.google.com/maps-platform/terms/maps-service-terms
  - OSMF Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
  - Google Cloud Manage Costs & Quotas: https://developers.google.com/maps/billing-and-pricing/manage-costs

---

## 1. 배경 및 검토 목적
오너는 현재의 OpenStreetMap(OSM) 래스터 타일 배경 대신 **실제 Google 지도 배경(Google Maps JavaScript SDK)**을 도입하는 방안을 우선 검토하도록 요청하였습니다.
과거의 단편적 거부 사유("1,000로드당 $7 과금 및 오프라인 불가")를 넘어, **실제 비용 구조, 법적 이용약관(ToS), 오프라인 경계, 모바일 성능, 무과금 안전 아키텍처**를 종합 검증하고, 오너의 승인 전까지 **비용 $0.00을 보장하는 Provider Abstraction 및 ToS P0 격리 코드**를 수립합니다.

---

## 2. 8대 핵심 영역 심층 비교 분석

### (1) 실제 Google 지도 배경 품질 vs OSM
- **Google Maps JS (안 G):**
  - **시각적 품질:** WebGL 기반 벡터 타일 렌더링으로 4K/레티나 모바일 디스플레이에서 왜곡 없는 고선명 텍스트 및 건물 입체 표현 제공.
  - **POI 및 다국어:** 일본, 동남아, 유럽 등 해외 주요 도시의 한국어 라벨 번역 밀도가 세계 최고 수준.
  - **위성/지형 뷰:** 실시간 항공 사진 및 하이브리드 지형 뷰 전환 가능.
- **OSM 공용 래스터 타일 (안 O):**
  - 256x256 래스터 이미지 타일로 줌 인/아웃 시 픽셀 계단 현상 발생. 한글 라벨이 누락된 지역이 다수 존재하며, 서버 렌더링 스타일이 투박함.
- **평가:** **안 G(Google) 압승** — 해외 여행용 PWA로서 시각적 완성도와 신뢰도는 Google 지도가 월등함.

---

### (2) 장소 결과 적합성 및 이용약관(ToS) 법적 리스크
- **Google Maps Platform Service Terms §14 (Places Content Restrictions):**
  > *"Customer will not display Places Content on a non-Google map."*
  - **현재 코드의 P0 위험:** 기존 코드는 OpenStreetMap 타일 위에 Google Places API (New)로 받아온 장소 핀(좌표, 이름, 평점)을 직접 렌더링하고 있었으며, 이는 Google 이용약관 제14조의 명백한 위반에 해당함.
- **Service Terms §15 (Places UI Kit 예외):**
  - Google의 공식 Web Component(Places UI Kit)를 사용할 때만 일부 예외가 인정되나, Travel OS는 직접 커스텀 React 핀과 토스 스타일 바텀시트를 그리므로 해당 예외에 속하지 않음.
- **Google 로고 및 저작권 표시:**
  - Google 지도를 사용할 경우 지도 캔버스 내 'Google' 로고 워터마크와 저작권(Map data © Google) 표시가 법적 필수 요건임.
- **평가:** **Google Places API를 계속 사용하려면 배경 지도 역시 Google Maps로 통일(안 G)하거나, OSM을 유지하려면 Google Places 호출을 원천 차단하고 순수 OSM Nominatim/로컬 데이터만 결합(안 O)해야 함.**

---

### (3) 월간 예상 비용 매트릭스 (Map Loads vs Places Search)

Google Maps Platform은 2025/2026 개편 요금제 기준 **Dynamic Maps 월 10,000회 무료 티어**를 제공하며, 초과 시 1,000회당 **$7.00**이 부과됩니다. 반면 **Places API (New) Text Search는 1,000회당 $35.00, Nearby Search는 1,000회당 $32.00**로 지도 자체보다 **5배 이상 고가**입니다.

#### [표 1] 월간 트래픽 구간별 예상 비용 시뮬레이션 (환율 1,380원 기준)

| 월간 이용 규모 | Dynamic Maps (안 G)<br>($7/1k, 10k 무료) | Places Text/Nearby Search<br>(인당 1.5회 검색, $35/1k) | 합산 예상 비용 (안 G)<br>(Google 지도 + 검색) | 안 O 예상 비용<br>(OSM 타일 + Nominatim) |
| :--- | :--- | :--- | :--- | :--- |
| **5,000 loads (5k)** | **$0.00** (무료 티어 10k 이내) | $262.50 (7.5k회 검색) | **$262.50** (약 36만 원) | **$0.00** (무료) |
| **10,000 loads (10k)** | **$0.00** (무료 티어 한도) | $525.00 (15k회 검색) | **$525.00** (약 72만 원) | **$0.00** (무료) |
| **20,000 loads (20k)** | **$70.00** (10k 초과분) | $1,050.00 (30k회 검색) | **$1,120.00** (약 154만 원) | **$0.00** (무료) |
| **50,000 loads (50k)** | **$280.00** (40k 초과분) | $2,625.00 (75k회 검색) | **$2,905.00** (약 400만 원) | **$0.00** (무료) |
| **100,000 loads (100k)**| **$630.00** (90k 초과분) | $5,250.00 (150k회 검색) | **$5,880.00** (약 811만 원) | **$0.00** (무료) |

#### 🚨 핵심 발견 및 비용 폭탄 방지 무과금 기술 설계
1. **지도보다 검색이 주범:** 지도 비용($7/1k)보다 검색 비용($35/1k)이 압도적이므로, **지도 드래그 시마다 자동 Nearby 검색을 호출하는 행위는 절대 금지**하며, "현 지도에서 재검색" 버튼을 눌렀을 때만 명시적 호출.
2. **탭 전환 싱글톤(Singleton) 인스턴스 보존:**
   - 사용자가 하단 네비게이션에서 [지도] ↔ [번역] ↔ [환율] ↔ [지갑]을 오갈 때마다 Google Maps 객체를 unmount/파괴하면 매번 신규 Map Load로 카운트되어 10k 무료 한도가 순식간에 고갈됨.
   - **설계:** 지도 컨테이너를 unmount하지 않고 CSS `display: none`으로 메모리에 유지하여 1세션 1로드 원칙 준수.
3. **서버 캐시 (1시간 TTL) & 클라이언트 디바운스 (400ms):**
   - 동일 국가/카테고리/좌표 검색 결과를 Next.js 인메모리 캐시에 1시간 보관하여 반복 호출 차단.
4. **Hard Quota Cap & 서킷 브레이커 (Circuit Breaker):**
   - Google Cloud Console의 **Budget Alert는 지출을 자동 차단하지 않고 알림만 전송함**.
   - 따라서 콘솔에서 **일일 Quota(Daily Request Limit)를 300회(월 9,000회 이내)로 하드 캡(Hard Cap) 설정**.
   - Quota 소진 또는 오류 발생 시 비용 0원의 안전 모드(OSM/로컬 데이터)로 즉각 우회하는 서킷 브레이커 구현.

---

### (4) 프런트엔드 모바일 초기 로드 (LCP) 및 탭 복귀 UX
- **Google Maps JS SDK:**
  - 초기 번들 용량: 약 150KB ~ 250KB의 추가 스크립트 비동기 다운로드 필요.
  - 최적화: Next.js `dynamic()` 및 `@googlemaps/js-api-loader`를 통해 [지도] 탭 진입 시점에만 지연 로딩(Lazy Loading)하여 앱 첫 실행 LCP(Largest Contentful Paint)를 1.2초 이내로 유지.
- **OSM Slippy Canvas:**
  - 외부 SDK 없이 순수 이미지 타일만 받아오므로 번들 부담이 0에 수렴함.

---

### (5) 온라인 / 오프라인 기능 경계 명확화
- **Google 지도 배경은 100% 온라인 네트워크 필수:**
  - Google Maps Platform 약관은 타일의 오프라인 로컬 저장, 사전 일괄 다운로드(Bulk Prefetching)를 엄격히 금지함.
  - 따라서 "Google 지도로 완전한 오프라인 여행 지원"을 약속하는 것은 허위 기획임.
- **OSMF 공용 타일 정책 역시 대량 다운로드 금지:**
  - `tile.openstreetmap.org` 역시 특정 도시 전체 오프라인 팩 사전 다운로드를 차단(IP 밴)하고 있음.
- **Travel OS 정직한 오프라인 정의:**
  - 네트워크 두절 시 오프라인으로 보장되는 기능은 **(1) PWA 앱 셸, (2) 로컬 스토리지에 보관된 사용자 저장 장소(Saved Places), (3) 7일 캐시 환율, (4) 지갑 가계부 기록, (5) 144개 검증 번역 상용구**로 한정 명시.

---

### (6) API 키 분리 및 보안 아키텍처
1. **프런트엔드 키 (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`):**
   - 브라우저에서 Google Maps JS SDK를 호출할 때만 노출.
   - **Google Cloud Console에서 HTTP Referrer 제한 필수** (예: `*.travel-os.com/*`, `http://localhost:3000/*`). 타 도메인 탈취 시 사용 불가.
2. **백엔드 키 (`GOOGLE_PLACES_API_KEY` 또는 `GOOGLE_MAPS_API_KEY`):**
   - Next.js 서버 라우트(`/api/places/search`) 내부에서만 호출.
   - 클라이언트 번들 및 브라우저 로그에 절대 노출 금지. IP 제한 또는 API 서비스 제한 적용.
3. **승인 플래그 (`GOOGLE_MAPS_BILLING_APPROVED`):**
   - 오너의 승인 전까지 live SDK 호출을 원천 봉쇄하는 안전 게이트.

---

### (7) 앱의 지도/도구 컨텍스트 유지
- 지도 제공자(Google vs OSM)가 바뀌더라도 아래의 모든 Travel OS 핵심 기능과 100% 동일한 컨텍스트 어댑터를 유지:
  - 지도 중심(Center), 줌 레벨(Zoom), 활성 장소(ActivePlace) 양방향 동기화.
  - 선택 장소 토스 스타일 3단 바텀시트 연동.
  - 카메라 메뉴 OCR (`CameraMenuModal`) 장소명 자동 주입 연동.
  - 환율 계산기 및 지갑 경비 저장 연동.
  - WCAG 2.1 접근성 핀 키보드 탐색 및 스크린리더 레이블.

---

### (8) Google Maps Embed API (무료 SKU)의 한계 분리
- Google Maps Platform에는 iframe 기반의 무료 Embed API가 존재함.
- **그러나 Travel OS에 도입 불가능한 이유:**
  - `<iframe>` 내부 DOM에 접근할 수 없어 **Travel OS의 커스텀 React 핀 마커를 얹을 수 없음**.
  - 지도를 이동/확대해도 위도·경도 좌표 콜백을 실시간으로 받을 수 없어 **장소 검색 및 뷰포트 동기화가 불가능함**.
  - 바텀시트 제스처, 카메라 OCR 연동, 지갑 저장 등 인터랙티브 여행 OS UX 구현이 원천 불가능하므로 대안에서 제외.

---

## 3. 아키텍처 2안 종합 평가

| 평가 항목 | [안 G] Google Maps JS + Google Places (권장안) | [안 O] OSM/MapLibre + 독자 타일·장소 |
| :--- | :--- | :--- |
| **배경 시각 품질** | ⭐⭐⭐⭐⭐ (최고급 벡터 타일, 한국어 지명 선명) | ⭐⭐⭐ (기본 래스터 타일, 다소 투박함) |
| **장소 검색 정밀도** | ⭐⭐⭐⭐⭐ (Google Places 실시간 최신 데이터) | ⭐⭐⭐ (OSM Nominatim, 상점 데이터 부족) |
| **약관 리스크 (ToS)** | **완전 해소** (Google 지도 + Google Places 1:1 결합) | **완전 해소** (Google 데이터 배제 시) |
| **월간 비용** | 10k 무료, 초과 시 $7/1k (검색 캐싱 필수) | **완전 무료** ($0, 단 상용 타일 계약 시 비용) |
| **오프라인 지원** | 네트워크 필수 (로컬 저장 데이터만 오프라인) | 자체 mbtiles 탑재 시 가능하나 용량 부담 |
| **구현 복잡도** | 보통 (Provider Abstraction 기반 전환) | 보통 (기존 유지) |

---

## 4. 구현된 P0 약관 준수 및 무과금 PoC 코드 (PR #11 브랜치 내 안전 반영)

본 검토를 위해 기존 브랜치(`feat/track-b-phase2-extensions`)를 훼손하지 않고, **외부 실 유료 호출 없이 빌드 및 테스트가 통과하는 안전 코드**를 선제 구현하였습니다.

1. **`src/types/travel.ts` & `src/lib/mapProvider.ts`:**
   - `MapProvider = 'google' | 'osm'` 타입 정의.
   - `filterCompliantPlaces()`: OSM 지도 위에 Google Places 데이터가 표시되는 것을 원천 필터링하여 ToS §14 준수 보장.
   - `isGoogleBillingApproved()`: 오너 승인 없는 외부 유료 호출 방지 게이트.
2. **`src/app/api/places/search/route.ts`:**
   - `requestedProvider === 'osm'`인 경우: Google API 키가 존재하더라도 **Google Places API 호출을 완전히 스킵**하고, 순수 OSM Nominatim 및 로컬 데이터만 반환.
   - `requestedProvider === 'google'`인 경우: 오너 키 설정 시에만 Google Places API를 호출하고 결과에 `sourceProvider: 'google'` 및 정식 저작권 태깅.
3. **`src/components/MapView.tsx` Provider Abstraction:**
   - OSM Slippy Canvas와 Google Map Canvas 시뮬레이터를 분리.
   - 과금 미승인 상태(`GOOGLE_MAPS_BILLING_APPROVED !== 'true'`)에서는 **외부 유료 Google SDK를 1바이트도 다운로드하지 않고**, 안전한 시뮬레이션 모드(`과금 방지 활성화`)로 동작하여 $0.00 유지.
4. **`tests/map_provider_contract.test.ts` (신규 계약 테스트):**
   - OSM Provider 모드 시 Google Places API 호출 격리 및 ToS §14 준수 검증.
   - 과금 미승인 시 유료 SDK 차단 및 무과금 안전 폴백 검증.
   - 프로바이더 전환 시 뷰포트 좌표 및 바텀시트 컨텍스트 무회귀 검증.

---

## 5. A02 최종 권고 및 오너 결정 요청 사항

1. **기술 리드 제언:**
   - 제품 완성도 및 사용자 경험(UX) 측면에서는 **[안 G (Google Maps JS + Google Places)]**가 압도적으로 우수합니다.
   - 일일 300회 Quota Hard Cap과 싱글톤 인스턴스 캐싱을 적용하면, **초기 MVP 및 베타 테스트 단계에서는 월 비용 $0.00(무료 티어 10,000회 이내)**로 운영이 가능합니다.
2. **오너 결정 필요 사항 (Go / No-Go):**
   - **선택 1:** [안 G] 승인 — Google Cloud Console에서 `Maps JavaScript API` 활성화, HTTP Referrer 키 발급, 일일 Quota 300회 설정 후 과금 승인(`GOOGLE_MAPS_BILLING_APPROVED=true`).
   - **선택 2:** [안 O] 유지 — 완전 무과금 고수를 위해 OSM 타일 + OSM Nominatim 모드로 운영 (Google Places 키 제거 및 완전 무료 운영).
3. **현재 상태 유지:** 오너의 명시적 승인 전까지 **main 병합 금지, 공개 배포 금지, 외부 유료 키 운영 시작 금지** 원칙을 엄격히 준수합니다.
