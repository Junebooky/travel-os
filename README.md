# Travel OS (모바일 맞춤 실시간 여행 비서 웹앱)

> **글로벌 여행자를 위한 통합 모바일 OS 웹 애플리케이션**  
> 지도·번역·환율·상황별 여행 액션이 하나의 매끄러운 사용자 흐름으로 연결된 완성형 MVP입니다.

---

## 📱 주요 핵심 기능

1. **상황별 Slippy 지도 (Map View)**
   - OpenStreetMap Web Mercator 실지형 타일 렌더링 및 핀 인터랙션
   - Nominatim 이용 정책(AUP)을 완벽히 준수한 **제출(엔터/버튼/카테고리) 기반 검색** 및 1초 레이트 리미트/인메모리 캐시
   - 원격 도시(예: 도쿄에서 오사카 검색) 검색 시 **자동 뷰포트 재중심화** 및 빠른 장소 이동 칩 제공
   - 길찾기(Google Maps), 번역, 환율, 북마크 저장 원클릭 연동 바텀시트

2. **상황별 즉시 번역 (Translate View)**
   - 8개 주요 여행국 다국어 양방향 번역 (한국어 ↔ 현지어)
   - A03 공식 카피 덱 기반의 표준화된 9개 카테고리 칩
   - **입력 수정 즉시 번역 결과 무효화** 및 `AbortController` 기반 비동기 경합 상태 방지
   - 상대방에게 보여주기 편한 **180도 화면 반전 전체화면 큰 글씨 모드** 및 현지 발음 가이드, TTS 지원

3. **신뢰 기반 정밀 환율 계산기 (Currency View)**
   - 유럽중앙은행(ECB) 공시 기준 실시간 환율 연동 (`open.er-api.com`)
   - 1:1 임의 대체(Fallback)를 완전히 제거하고 유효한 수치만 정밀 검증
   - 환율 갱신 성공 시점에만 안내 토스트 노출 및 직관적인 오프라인/오류 상태 재시도 제공
   - 현지 금액 퀵 증감 칩 및 주요 여행 예산 일람표

4. **온보딩 및 여행 설정 (Onboarding & Settings)**
   - 4단계 초기 설정 (국가 선택 → 언어 설정 → 화폐 설정 → 위치 권한 안내)
   - GPS 허용 시 사용자 실제 위치로 지도 뷰포트 자동 초기화
   - 언제든지 여행 국가 및 설정을 초기화/변경 가능한 데이터 관리

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

Travel OS는 19건의 단위, 계약, E2E 통합 테스트와 A04 QA 결함 회귀 테스트를 내장하고 있습니다.

```bash
# 1. 린트 정적 분석
npm run lint

# 2. 타입스크립트 타입 무결성 검증
npx tsc --noEmit

# 3. 전체 테스트 스위트 실행 (Node.js test runner)
npm test

# 4. 프로덕션 빌드 검증
npm run build
```

### 테스트 커버리지 및 회귀 검증 항목
- `tests/copy_contract.test.ts`: A03 326개 전체 UX 카피 키 1:1 계약 검증, `MAP_CATEGORIES` / `TRANSLATE_CATEGORIES` 동적 키 일치 검증 (**QA-P1-01 회귀 방지**)
- `tests/e2e_flow.test.ts`: 온보딩부터 지도-번역-환율-저장소 라이프사이클 검증, 텍스트 편집 시 이전 번역 즉각 초기화 검증 (**QA-P1-02 회귀 방지**), 원격 도시 검색 시 뷰포트 자동 이동 검증 (**QA-P1-03 회귀 방지**)
- `tests/api_routes.test.ts`: 실시간 환율 엔드포인트 무결성, 불완전 환율 응답 시 1:1 대체 거부 및 정밀 검증 (**QA-P1-05 회귀 방지**), Nominatim 인메모리 캐시 및 카테고리 정규화 검증 (**QA-P1-04 회귀 방지**)
- `tests/travel_data.test.ts`: 8개 주요국 데이터 및 6개 상황별 실전 회화 데이터 무결성 검증

---

## 🏗 CI/CD 파이프라인

`.github/workflows/ci.yml`을 통해 모든 `push` 및 `PR` 시 자동으로:
1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm test`
5. `npm run build`
가 실행되어 코드 품질을 보장합니다.
