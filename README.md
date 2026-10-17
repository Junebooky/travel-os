# Travel OS (모바일 맞춤 실시간 여행 비서 웹앱)

> **글로벌 여행자를 위한 통합 모바일 OS 웹 애플리케이션**  
> 지도·번역·환율·저장 장소·상황별 여행 액션이 하나의 매끄러운 사용자 흐름으로 연결된 완성형 MVP입니다.

---

## 📊 MVP 기능 상태 매트릭스 (Feature Matrix)

| 구분 | 기능 항목 | 상태 | 기술 상세 및 구현 내용 |
|---|---|:---:|---|
| **지도 (Map)** | 실지형 Slippy 지도 타일 | `완료` | OpenStreetMap Web Mercator 타일 렌더링, 핀 마커 및 원터치 장소 시트 |
| **지도 (Map)** | 실시간 Nominatim 장소 검색 | `완료` | OSM 이용 정책(AUP) 준수, 제출/카테고리 기반 쿼리, 인메모리 1초 스로틀 및 캐시 |
| **지도 (Map)** | 지도 뷰포트 맥락 유지 | `완료` | 탭 전환·앱 재접속·저장 장소 복귀 시 드래그/줌 위치 완벽 영속 동기화 (`travel_os_viewport_v1`) |
| **번역 (Translate)** | 8개국 다국어 양방향 번역 | `완료` | 한국어 ↔ 8개 언어, Gemini API 연동 및 정규화된 326개 실전 표현 fallback |
| **번역 (Translate)** | 180° 플립 모드 & 음성(TTS) | `완료` | 현지인에게 화면 보여주기 편한 큰 글씨 180도 화면 반전 및 현지 발음 가이드 |
| **환율 (Currency)** | 정밀 실시간 환율 계산기 | `완료` | 유럽중앙은행(ECB) 공시 기준 실시간 환율 연동 (`open.er-api.com`), 1:1 임의 대체 배제 |
| **환율 (Currency)** | 제한적 오프라인 환율 | `완료` | 마지막 정상 환율 로컬 보관 (`travel_os_last_rates_v1`), **최대 7일 유효성 엄격 검증**, stale 라벨 정직 표시 |
| **저장소 (Saved)** | 저장 장소 P1 관리 | `완료` | 중복 저장 방지, 지도 뷰포트 연동 열기, 전체 삭제 확인 모달, 빈 화면 가이드 CTA |
| **사용자 설정** | 설정 지속성 (Persistence) | `완료` | 국가·언어·통화·온보딩·저장소·뷰포트 6개 키 독립 지속, QuotaExceeded/손상 JSON 무중단 방어 |
| **PWA & 오프라인** | PWA 앱 설치 및 스탠드얼론 | `완료` | 표준 Web App Manifest, 192/512 PNG 및 Apple Touch 아이콘, Android/iOS 안내 UI |
| **PWA & 오프라인** | 안전한 정적 앱 셸 Service Worker | `완료` | 자체 정적 자산(`/`, `manifest.json`, 아이콘) 전용 오프라인 캐시, 외부 타일 및 `/api/*` 캐시 엄격 배제 |
| **모바일 UX** | 모바일 인체공학 & 접근성 | `완료` | iOS Safe Area 하단 인셋 완벽 대응, 48px 이상 터치 타깃 준수, `userScalable: false` 접근성 장벽 제거 |
| **출시 검증** | 모바일 자동 스모크 테스트 | `완료` | `scripts/mvp-smoke-test.mjs` 러너, 24개 단위/통합/회귀 테스트 전체 통과 |
| **배포/운영** | 프로덕션 병합 및 공개 배포 | `오너 결정 필요` | 오너 명시적 승인 전 병합(`main`) 및 외부 공개 배포 보류 상태 |

---

## 📱 PWA 설치 및 오프라인 동작 범위 명세

### 1. PWA 설치 가이드
- **Android / Desktop (Chrome, Edge 등)**: 설정 화면 내 '앱 설치' 버튼 활성화 → 클릭 시 브라우저 네이티브 설치 다이얼로그 호출 → 홈 화면/앱 서랍에 독립 창(Standalone)으로 추가.
- **iOS (Safari)**: 브라우저 보안 정책상 자바스크립트 직접 설치 다이얼로그가 제한되므로, 설정 화면에서 단계별 가이드 안내(`공유 버튼(사각형 화살표)` → `홈 화면에 추가`) 제공.

### 2. 오프라인 동작 범위 (Offline Scope)
- **정적 앱 셸 보장**: Service Worker(`public/sw.js`)를 통해 오프라인 환경에서도 앱 진입 화면, UI 셸, 온보딩, 저장한 장소 일람, 정적 아이콘이 즉시 렌더링됩니다.
- **환율 계산기**: 비행기 모드나 통신 불량 시 최근 7일 이내에 수신된 유효 환율 데이터(`travel_os_last_rates_v1`)가 있으면 환전 계산 기능을 유지하며, 화면에 `오프라인 보관 환율 (기준일 표시)`을 정직하게 표기합니다.
- **철저한 배제 원칙**:
  - OpenStreetMap 타일 및 Google Places API 등 외부 타사 자산은 브라우저 스토리지 오염 및 저작권 정책을 고려하여 오프라인 캐싱하지 않고, 연결 불량 안내를 명확히 노출합니다.
  - 임의의 가짜 환율(Mock rates)이나 조작된 오늘 날짜는 절대 생성하지 않습니다.

---

## 🚀 빠른 시작 (Getting Started)

### 사전 요구 사항
- Node.js 20.x 이상
- npm 10.x 이상

### 설치 및 로컬 서버 실행
```bash
# 1. 의존성 패키지 설치
npm install

# 2. 로컬 개발 서버 실행 (Turbopack)
npm run dev

# 브라우저 접속: http://localhost:3000
```

### 모바일 미리보기 권장 설정
1. 브라우저(Chrome / Safari) 개발자 도구(`F12` 또는 `Cmd+Opt+I`)를 엽니다.
2. 기기 툴바 전환(`Cmd+Shift+M`)을 활성화합니다.
3. 기기를 **iPhone 14 Pro (393 × 852)** 또는 **Pixel 7 (412 × 915)** 로 선택합니다.

---

## 🔑 환경 변수 설정 (Optional)

Travel OS는 외부 API 키가 없어도 **정규화된 여행 데이터셋 및 OpenStreetMap/ECB 환율을 통해 100% 정상 작동(데모 모드)**합니다. 실제 프로덕션 외부 API를 연동하려면 `.env.local`에 아래 키를 설정하세요:

```env
# Google Gemini API Key (미설정 시 상황별 검증 문장 자동 추천 fallback 제공)
GEMINI_API_KEY=your_gemini_api_key_here

# Google Places API Key (미설정 시 OpenStreetMap Nominatim 지리원 데이터 및 인기 장소 제공)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

## 🧪 테스트 및 품질 검증

Travel OS는 24건의 단위, 계약, E2E 통합 테스트와 10건의 모바일 자동 스모크 테스트를 내장하고 있습니다.

```bash
# 1. 린트 정적 분석
npm run lint

# 2. 타입스크립트 타입 무결성 검증
npx tsc --noEmit

# 3. 전체 테스트 스위트 실행 (단위 테스트 + 모바일 스모크 테스트)
npm test

# 4. 모바일 스모크 테스트 단독 실행
npm run smoke:mobile

# 5. 프로덕션 빌드 검증 (Turbopack)
npm run build
```

### 테스트 커버리지 및 주요 회귀 검증
- `tests/issue7_pwa_persistence.test.ts`: 6개 로컬 스토리지 키 영속성, 예외 격리(QuotaExceeded/손상 JSON), 중복 저장 방지, 환율 7일 만료 및 무결성, PWA Manifest 및 Service Worker 무결성, 줌 차단 해제 검증.
- `tests/copy_contract.test.ts`: A03 326개 전체 UX 카피 키 1:1 계약 검증, `MAP_CATEGORIES` / `TRANSLATE_CATEGORIES` 동적 키 일치 검증 (**QA-P1-01 회귀 방지**).
- `tests/e2e_flow.test.ts`: 온보딩부터 지도-번역-환율-저장소 라이프사이클 검증, 텍스트 편집 시 이전 번역 즉각 초기화 검증 (**QA-P1-02 회귀 방지**), 원격 도시 검색 시 뷰포트 자동 이동 검증 (**QA-P1-03 회귀 방지**).
- `tests/api_routes.test.ts`: 실시간 환율 엔드포인트 무결성, 불완전 환율 응답 시 1:1 대체 거부 및 정밀 검증 (**QA-P1-05 회귀 방지**), Nominatim 인메모리 캐시 및 카테고리 정규화 검증 (**QA-P1-04 회귀 방지**).
- `tests/travel_data.test.ts`: 8개 주요국 데이터 및 상황별 실전 회화 데이터 무결성 검증.
- `scripts/mvp-smoke-test.mjs`: PWA 메타데이터, 모바일 인체공학(48px 터치 영역/SafeArea), 스토리지 복원력, 뷰포트 양방향 동기화 자동 검증.

---

## 📋 MVP 출시 준비 체크리스트 (Release Operations Checklist)

- [x] **A03 UX 카피 덱 100% 반영**: 326개 키 누락 없음, 하드코딩 문구 제거.
- [x] **A04 QA 결함 5건(QA-P1-01 ~ QA-P1-05) 회귀 테스트 전수 통과**: 자동화 테스트로 영구 보호.
- [x] **모바일 뷰포트 접근성 장벽 제거**: WCAG 2.1 기준 준수 (`userScalable: false` 배제).
- [x] **iOS Safe Area 패딩 대응**: 하단 탭 내비게이션 홈 바 간섭 방지 (`safe-area-inset-bottom`).
- [x] **터치 타깃 최소 규격 충족**: 인터랙티브 요소 최소 48px 터치 영역 확보.
- [x] **PWA 규격 충족**: Web App Manifest, 192x192, 512x512 PNG, Apple Touch Icon, Service Worker 등록.
- [x] **오프라인 데이터 정직성**: 임의 가짜 환율 생성 차단, 7일 이내 캐시만 stale 표시 후 허용.
- [x] **스토리지 결함 방어**: Private Browsing / QuotaExceeded / Malformed JSON 무중단 처리.
- [x] **GitHub Actions CI 통과**: Lint, TypeScript, Test Suite, Production Build 100% Green.
- [ ] **오너 최종 승인**: `main` 브랜치 병합 및 프로덕션 환경 공개 배포 승인 (승인 대기 중).
