# ADR-002: 지도 공급자 아키텍처 결정 · Google 지도 배경 도입 vs OSM/MapLibre 비교 및 무과금 안전 기술 설계 (개정판)

- **상태:** PROPOSED / POC_IMPLEMENTED / OWNER_APPROVAL_PENDING (CHANGES_APPLIED)
- **날짜:** 2026-10-18 (Issue #21 검토 피드백 반영 개정)
- **발신:** A02 (수석 풀스택 개발 리드)
- **수신:** A01 (제품 아키텍처 결정 및 오너 인계), A03 (UI/UX 디자인 정합)
- **관련 이슈:** [Issue #20](https://github.com/Junebooky/travel-os/issues/20), [Issue #21](https://github.com/Junebooky/travel-os/issues/21), [Issue #13 (Team Hub)](https://github.com/Junebooky/travel-os/issues/13)
- **공식 근거 자료:**
  - Google Maps Platform Pricing: https://developers.google.com/maps/billing-and-pricing/pricing?hl=ko
  - Google Maps Platform Service Terms (§14 Places Content): https://cloud.google.com/maps-platform/terms/maps-service-terms
  - OSMF Tile Usage Policy: https://operations.osmfoundation.org/policies/tiles/
  - Google Cloud Manage Costs & Quotas: https://developers.google.com/maps/billing-and-pricing/manage-costs

---

## 1. 배경 및 검토 목적
오너는 현재의 OpenStreetMap(OSM) 래스터 타일 배경 대신 **실제 Google 지도 배경(Google Maps JavaScript SDK)**을 도입하는 방안을 우선 검토하도록 요청하였습니다.
과거의 단편적 거부 사유("1,000로드당 $7 과금 및 오프라인 불가")를 넘어, **실제 비용 구조, 법적 이용약관(ToS), 오프라인 경계, 모바일 성능, 무과금 안전 아키텍처**를 종합 검증하고, 오너의 명시적 과금 승인 전까지 **비용 $0.00을 철저히 보장하는 Provider Abstraction 및 서버 측 과금 차단 게이트**를 수립합니다.

> **⚠️ 구현 범위 명확화 (P0-2 반영):**  
> 현재 코드에 반영된 Google 모드는 **외부 유료 SDK/API 호출을 1바이트도 발생시키지 않는 컴포넌트 경계 추상화 및 레이아웃 시뮬레이션(스텁)**입니다. 실제 Google Maps JS SDK 라이브러리 로드, 실제 타일 렌더링, 실제 SDK pan/zoom 콜백 및 SDK LCP 실측은 **오너의 키/Billing 승인 전까지 미연결(NOT_TESTED) 상태**로 보존됩니다.

---

## 2. 8대 핵심 영역 심층 비교 분석

### (1) 실제 Google 지도 배경 품질 vs OSM
- **Google Maps JS (안 G 목표 품질):**
  - WebGL 기반 벡터 타일 렌더링으로 4K/레티나 모바일 디스플레이에서 왜곡 없는 고선명 텍스트 및 건물 입체 표현 제공.
  - 일본, 동남아, 유럽 등 해외 주요 도시의 한국어 라벨 번역 밀도가 세계 최고 수준.
  - 실시간 항공 사진 및 하이브리드 지형 뷰 전환 가능.
- **OSM 공용 래스터 타일 (안 O):**
  - 256x256 래스터 이미지 타일로 줌 인/아웃 시 픽셀 계단 현상 발생. 한글 라벨이 누락된 지역이 다수 존재하며, 서버 렌더링 스타일이 투박함.
- **평가:** 시각적 완성도와 신뢰도는 **안 G(Google) 목표 품질이 월등함**.

---

### (2) 장소 결과 적합성 및 이용약관(ToS) 법적 리스크 (P0 해결 완료)
- **Google Maps Platform Service Terms §14 (Places Content Restrictions):**
  > *"Customer will not display Places Content on a non-Google map."*
  - **P0 조치 완료:** 기존 코드에서 OSM 타일 위에 Google Places API (New)로 받아온 장소 핀을 표시하던 잠재적 위반 경로를 **서버 및 클라이언트 단에서 원천 차단**하였습니다.
  - `provider=osm`인 경우: Google API 키가 서버 환경에 존재하더라도 **Google Places API 호출을 완전히 스킵**하고, 순수 OSM Nominatim 및 로컬 검증 데이터만 반환합니다.
  - `sourceProvider: 'google'`로 태깅된 장소는 `filterCompliantPlaces` 함수에 의해 OSM 지도 캔버스 렌더링에서 엄격히 배제됩니다.
- **Service Terms §15 (Places UI Kit 예외):**
  - Google의 공식 Web Component(Places UI Kit)를 사용할 때만 일부 예외가 인정되나, Travel OS는 직접 커스텀 React 핀과 토스 스타일 바텀시트를 그리므로 해당 예외에 속하지 않습니다.

---

### (3) 월간 예상 비용 매트릭스 (SKU별 무료량 정밀 반영 개정)

Google Maps Platform 개편 요금제(2025/2026 공식 기준)의 SKU별 가격 및 무료 할당량을 엄밀하게 매핑하여 재산출하였습니다.

#### 1. SKU 판정 근거 (FieldMask 매핑)
- **Dynamic Maps:** **월 10,000회 무료**, 초과 시 **$7.00 / 1,000 loads**.
- **Places API (New) Text Search SKU 분기:**
  - 현재 `src/app/api/places/search/route.ts`의 FieldMask:  
    `places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryTypeDisplayName`
  - `rating`, `userRatingCount`가 포함되어 있으므로 **Text Search (Enterprise)** SKU로 과금됩니다.
  - **Enterprise SKU:** **월 1,000회 무료**, 초과 시 **$35.00 / 1,000 requests**.
  - *(참고 최적화 옵션: `rating`과 `userRatingCount`를 제외하고 Basic 필드만 요청할 경우 **Pro SKU (월 5,000회 무료, 초과 $32.00/1,000 requests)**로 비용 절감 가능)*

#### 2. 월간 트래픽 구간별 예상 비용 시뮬레이션 표 (환율 1,380원 기준)
- **전제:** 지도 1회 로드당 평균 1.5회의 장소 검색이 발생한다고 가정 (5k loads → 7,500 searches; 10k loads → 15,000 searches; 20k loads → 30,000 searches; 50k loads → 75,000 searches; 100k loads → 150,000 searches).
- **산식:**
  - 지도 비용 = `max(0, Loads - 10,000) * $0.007`
  - 현행 검색 비용(Enterprise) = `max(0, Searches - 1,000) * $0.035`
  - 최적화 검색 비용(Pro) = `max(0, Searches - 5,000) * $0.032`

| 월간 이용 규모 | Dynamic Maps<br>(10k 무료, 초과 $7/1k) | [현행] Search Enterprise<br>(1k 무료, 초과 $35/1k) | [현행] 합산 예상 비용<br>(안 G: Maps + Enterprise) | [최적화] Search Pro<br>(5k 무료, 초과 $32/1k) | [최적화] 합산 비용<br>(안 G: Maps + Pro) | 안 O 비용<br>(OSM 타일 + Nominatim) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **5,000 loads** (7.5k 검색) | **$0.00** (10k 무료 이내) | **$227.50** (6.5k * $35) | **$227.50** (약 31.4만 원) | **$80.00** (2.5k * $32) | **$80.00** (약 11.0만 원) | **$0.00** (무료) |
| **10,000 loads** (15k 검색) | **$0.00** (10k 무료 한도) | **$490.00** (14k * $35) | **$490.00** (약 67.6만 원) | **$320.00** (10k * $32) | **$320.00** (약 44.1만 원) | **$0.00** (무료) |
| **20,000 loads** (30k 검색) | **$70.00** (10k * $7) | **$1,015.00** (29k * $35) | **$1,085.00** (약 149.7만 원)| **$800.00** (25k * $32) | **$870.00** (약 120.0만 원) | **$0.00** (무료) |
| **50,000 loads** (75k 검색) | **$280.00** (40k * $7) | **$2,590.00** (74k * $35) | **$2,870.00** (약 396.0만 원)| **$2,240.00** (70k * $32) | **$2,520.00** (약 347.7만 원)| **$0.00** (무료) |
| **100,000 loads** (150k 검색)| **$630.00** (90k * $7) | **$5,215.00** (149k * $35)| **$5,845.00** (약 806.6만 원)| **$4,640.00** (145k * $32) | **$5,270.00** (약 727.2만 원)| **$0.00** (무료) |

#### 3. 비용 통제 한계 및 전제 공개 (P1-3 보강)
- **일일 300회 한도의 현실적 한계:**
  - 31일 달(9,300회), 월초 트래픽 집중, Maps와 Places의 비대칭 호출, 캐시 미스 등으로 인해 단순 일일 300회 설정만으로 월간 무료량을 완벽히 보증할 수 없습니다.
  - **콘솔 Quota 상태:** 현재 Google Cloud 콘솔에 Quota 상한이 설정된 적이 없으며, 오너가 콘솔에서 서비스별(Maps JS vs Places New)로 독립적인 Daily Quota를 수동 설정해야 합니다.
  - **Budget Alert의 한계:** Google Cloud Billing Budget Alert는 이메일 알림만 전송할 뿐 트래픽을 자동 차단하지 않습니다. 따라서 **Daily Request Limit Hard Cap**이 유일한 실질적 방어선입니다.
- **OSM 공용 서버의 장기적 비용 한계:**
  - OSMF 공용 타일 서버(`tile.openstreetmap.org`) 역시 무료 공공재이므로 상업적 트래픽 증가 시 IP 차단될 수 있습니다. 장기적 상업 운영 시 자체 타일 서버(AWS EC2/CloudFlare 인스턴스: 월 약 $30~$50) 또는 상용 MapLibre 타일 제공자(Mapbox/Protomaps) 유료 계약이 필요합니다.

---

### (4) 프런트 모바일 초기 로드 (LCP) 및 탭 복귀 UX
- **현재 구현 상태:**
  - Next.js 기반에서 Provider Abstraction 인터페이스를 구현하였으며, OSM 캔버스와 모의 Google 캔버스 모두 초기 앱 셸 번들 부담 없이 즉시 렌더링됩니다.
  - 향후 실제 Google Maps JS SDK 연동 시, 첫 진입 번들에 SDK를 번들링하지 않고 Next.js `dynamic()` 지연 로딩을 적용하는 아키텍처를 준비하였습니다. (단, 실제 SDK 다운로드 속도 및 LCP 영향은 오너 승인 후 실 SDK 탑재 시 실측 예정).
- **탭 복귀 UX:**
  - 하단 탭 전환 시 지도 뷰포트 좌표(Center, Zoom) 및 선택 장소(ActivePlace) 컨텍스트가 React 상태 트리에서 100% 보존됩니다.

---

### (5) 온라인 / 오프라인 기능 경계 명확화
- **Google 지도는 100% 온라인 네트워크 필수:**
  - Google 약관은 타일의 오프라인 사전 다운로드/로컬 저장을 엄격히 금지합니다.
  - "Google 지도로 완전한 오프라인 여행 지원"은 기술적·약관상 불가능합니다.
- **OSMF 공용 타일 역시 사전 대량 다운로드 금지:**
  - OSMF 타일 정책상 도시 전체 오프라인 팩 다운로드는 IP 밴 대상입니다.
- **Travel OS 정직한 오프라인 정의:**
  - 네트워크 두절 시 오프라인으로 보장되는 기능은 **(1) PWA 앱 셸, (2) 로컬 스토리지에 보관된 사용자 저장 장소(Saved Places), (3) 7일 캐시 환율, (4) 지갑 가계부 기록, (5) 144개 검증 번역 상용구**로 한정 명시합니다.

---

### (6) API 키 분리 및 서버 사이드 과금 차단 게이트 (P0-1 완료)
1. **서버 사이드 권한 게이트 (`isServerGoogleBillingApproved()`):**
   - 클라이언트의 파라미터(`provider=google`)나 `NEXT_PUBLIC_*` 환경변수를 절대 신뢰하지 않고, 오직 서버 전용 환경변수 **`GOOGLE_MAPS_BILLING_APPROVED === 'true'`**일 때만 Google Places 외부 API 호출을 허용합니다.
   - 미승인 시: 요청이 `provider=google`이더라도 **외부 Google Places API fetch를 0건(Zero Outbound Call)**으로 강제 차단하고 안전한 로컬 모의 데이터를 반환합니다.
2. **서버 전용 비밀 키 (`GOOGLE_PLACES_API_KEY`):**
   - 서버 라우트(`/api/places/search`)는 오직 서버 전용 `GOOGLE_PLACES_API_KEY`만 사용하며, 클라이언트용 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`를 서버 Places 인증에 재사용하는 경로를 완전히 제거하였습니다.

---

### (7) 앱 컨텍스트 양방향 연동 유지
- Provider가 OSM이든 Google(모의)이든 관계없이:
  - 지도 줌/중심/선택 장소 동기화.
  - 토스 스타일 3단 바텀시트.
  - 카메라 메뉴 OCR (`CameraMenuModal`) 연동.
  - 환율 계산기 및 지갑 경비 저장 연동.
  - WCAG 2.1 접근성 핀 키보드 탐색 및 스크린리더 레이블 100% 보존.

---

### (8) Google Maps Embed API (무료) 한계
- iframe 내부 DOM 접근 불가로 커스텀 React 핀 마커 및 바텀시트 연계 불가.
- 실시간 좌표 양방향 콜백 불가로 Travel OS 인터랙티브 UX 구현 불가 확인.

---

## 3. 구현된 코드 및 무과금 PoC 검증 내역

1. **`src/lib/mapProvider.ts` (서버 과금 게이트 및 키 격리):**
   - `isServerGoogleBillingApproved()`: 서버 전용 환경변수 `GOOGLE_MAPS_BILLING_APPROVED === 'true'` 검증.
   - `getServerGooglePlacesApiKey()`: `GOOGLE_PLACES_API_KEY` 서버 전용 키 추출 (클라이언트 키 폴백 완전 차단).
   - `isGooglePlacesCallAllowed()`: 승인 플래그와 서버 키가 모두 존재할 때만 true 반환.
   - `filterCompliantPlaces()`: OSM 캔버스에 Google Places 데이터가 유입되는 것을 원천 필터링 (ToS §14).
2. **`src/app/api/places/search/route.ts` (P0-1 게이트 적용):**
   - `requestedProvider === 'google'`이더라도 `!isGooglePlacesCallAllowed()`인 경우 외부 Google API 호출 0건 강제.
   - `requestedProvider === 'osm'`인 경우 Google API 호출 0건 및 순수 OSM/로컬 데이터 반환.
3. **`src/components/MapView.tsx` (P0-2 명칭 정정):**
   - 실제 Google 로고 모사를 제거하고, **"Google 지도 연결 전 디자인 예시 (미승인 시뮬레이션)"** 명칭으로 정정하여 오인 방지.
   - 우측 하단 저작권 역시 `Google 지도 연결 전 디자인 예시`로 명시.
4. **`tests/map_provider_contract.test.ts` (신규 무호출 계약 테스트 보강):**
   - `global.fetch` 스파이를 통해 미승인 상태에서 `fetch` 호출 수가 정확히 **0건**임을 엄격 검증.
   - `GOOGLE_PLACES_API_KEY`가 존재하더라도 승인 플래그 부재 시 외부 Google 호출 0건 검증.
   - 직접 GET 요청 및 쿼리 파라미터 조작 시에도 외부 호출 0건 검증.

---

## 4. A02 최종 제언 및 오너 결정 요청 (Go / No-Go)

- **A02 기술 리드 제언:**
  - 사용자 경험(UX)과 해외 지명 품질을 위해서는 장기적으로 **[안 G (Google Maps JS + Google Places)]**가 이상적입니다.
  - 단, 비용 측면에서 `rating`/`userRatingCount`를 포함한 현행 Enterprise SKU는 1,000회 초과 시 $35/1k가 부과되므로, 목록 단계에서는 Basic 필드만 호출하여 **Pro SKU (월 5,000회 무료, $32/1k)**로 낮추는 필드 마스크 최적화를 강력히 권고합니다.
  - 또한 운영 개시 전, Google Cloud Console에서 반드시 **Daily Request Hard Quota(일일 상한)**를 설정해야 안전합니다.
- **오너 결정 필요 사항:**
  - **선택 1 [안 G 승인 절차 진행]:** 콘솔에서 `Maps JavaScript API` 및 `Places API (New)` 활성화, HTTP Referrer 클라이언트 키 발급, 서버 전용 키 발급, 일일 Quota 설정 완료 후 `GOOGLE_MAPS_BILLING_APPROVED=true` 승인.
  - **선택 2 [안 O 유지]:** 유료 API 계약 없이 완전 무료로 운영하기 위해 OSM 타일 + OSM Nominatim 모드로 운영 확정.
- **원칙 준수:** 오너의 명시적 과금 승인 전까지 **main 병합 금지, 공개 배포 금지, 외부 유료 키 운영 시작 금지, A04 QA PAUSED_BY_OWNER**를 지속합니다.
