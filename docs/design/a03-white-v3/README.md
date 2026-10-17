# Travel OS · White UI v3 — A03 visual implementation handoff

> **발신 A03 (디자인·UX Writing) → 수신 A02 (개발), A01 (오너)**  
> **상태:** `DESIGN_ASSETS_DELIVERED / CODE_NOT_APPLIED / DEVICE_QA_NOT_TESTED`  
> **기준 코드:** Track B [PR #11](https://github.com/Junebooky/travel-os/pull/11) HEAD `f08aa268ce50c68b4f48d8b95e71e370cb3a9cb9` (당시 open/unmerged).  
> **의미:** 아래 이미지는 **디자인 목적의 SVG 목업**이며 실제 실행 화면/QA 스크린샷이 아닙니다. 이미지 속 금액·장소·환율 기준일은 시각 설명을 위한 **가상 예시**입니다.

## A. 먼저 이미지로 전체 맥락 확인

![화이트 UI v3 7개 화면 스토리보드](./white-ui-v3-overview.svg)

| 번호 | 화면 이미지 | 개발 위치 | 반드시 동작해야 하는 것 |
|---|---|---|---|
| 01 | [지도 홈](./images/01-map.svg) | `src/components/MapView.tsx`, `Navigation.tsx` | 선택 장소 → 길찾기/상황별 번역. 시트 peek/expanded/지도 맥락·safe-area 보존 |
| 02 | [번역](./images/02-translate.svg) | `src/components/TranslateView.tsx` | **← 지도 복귀**는 독립 버튼. 장소명은 보조 텍스트. 실패 원문을 번역 성공처럼 표시 금지 |
| 03 | [환율](./images/03-rate.svg) | `src/components/CurrencyView.tsx` | 신뢰 가능한 캐시에서만 환산, 공급자·날짜·stale 인라인, 재시도는 인접 |
| 04 | [메뉴 사진 촬영 단계](./images/04-camera-capture.svg) | `src/components/CameraMenuModal.tsx` | 촬영·앨범 선택에 집중. 사진 서버/외부 AI 전송 사실은 업로드 **전에** 고지 |
| 05 | [사진 분석 결과 단계](./images/05-camera-result.svg) | `CameraMenuModal.tsx` | 원문/번역/가격 검토 후 **지출 내용 확인하기**. 실패 후 같은 사진 재분석 |
| 06 | [여행 지갑](./images/06-wallet.svg) | `src/components/WalletView.tsx` | 상단 `+ 기록`; 금액→날짜별 내역 연속. 미환산 N건은 요약에 바로 가시화 |
| 07 | [지출 입력](./images/07-expense.svg) | `WalletView.tsx`, `src/context/TravelContext.tsx` | OCR 후보/수동 금액 수정 → 최종 버튼 → **기기 저장 확인** 후에만 합계 반영 |

개발자가 이 문서/이미지를 복사해 실행 가능한 앱으로 오해하지 않도록 **화면 스타일 명세와 실제 수용 동작을 분리**했습니다.

## B. 오너 결정: 디자인 시스템 v3

기존 코드의 `globals.css --background:#020617`, Slate 900/950, 지도 이미지 invert/filter는 **이전 다크 UI의 구현**입니다. 오너가 확정한 목표는 밝은 쿨그레이 배경과 흰 카드로 정리한 독립 Travel OS UI입니다. Toss/TDS의 UX 원칙을 참고하지만 고유 브랜드 로고·라이선스가 필요한 그래픽은 복제하지 않습니다.

| 토큰(시맨틱 제안) | 값 | 목적 |
|---|---|---|
| `--os-page` | `#F2F4F6` | 전체 화면 기본 바탕 |
| `--os-surface` | `#FFFFFF` | 정보 카드·하단 탭·상단 헤더 |
| `--os-surface-subtle` | `#F8F9FA` | 입력/보조 구획 |
| `--os-text` | `#191F28` | 제목·원금·큰 금액 |
| `--os-text-secondary` | `#4E5968` | 보조 정보·날짜·출처 |
| `--os-text-muted` | `#6B7684` | 낮은 중요도 텍스트, 대비 재검증 |
| `--os-accent` | `#3182F6` | 선택·링크·비텍스트 포인트 |
| `--os-primary` | `#1B64DA` | 흰 텍스트가 놓이는 주 행동 버튼 |
| `--os-divider` | `#E5E8EB` | 필요 시 구획 구분/입력 포커스용 |

- **모든 1px 테두리를 기계적으로 삭제하지 마세요.** 일반 카드의 테두리는 제거하되 입력란의 경계·오류·포커스·선택·지도 귀속은 색과 형태/텍스트로 구별해야 합니다.
- 화면 배경은 쿨그레이, 카드/헤더/하단 탭은 순백. 카드 radius 16–20px, padding 16–20px, 주요 터치 영역 ≥44px(48px 권장).
- **아이콘:** 문자 `⌖ 文 ₩ ▤ ⚙`가 아니라 같은 패밀리의 실제 filled SVG 아이콘을 사용(무료/라이선스 확인된 것으로). 이미지의 간단한 벡터 아이콘은 최종 라이브러리 정의가 아니라 외형 참고입니다.
- 일반 버튼 라벨은 최소 14–16px, 큰 지출 숫자 28–34px, 장소/화면 제목 22–26px, 접근성 콘트라스트·200% 문자 확대 점검.
- 라이트 지도는 **OSM 타일의 다크 반전 필터를 제거**하고 출처 표기 유지. 기존 Google/OSM 실제 지도 동작은 재작성하지 않습니다.
- 기존 5탭 `지도·번역·환율·지갑·설정` 유지; 카메라는 별도 6번째 탭이 아니라 지도·번역 맥락에서 여는 플로우.

## C. 스크린별 실구현 행동 계약

### C-01. 지도
**현 구현 재사용:** peek/expanded sheet, 두 가지 첫 CTA(길찾기/장소 번역), 저장/가격/메뉴 사진, 선택 핀 상태, 유효 데모 라벨, 확대축소/내 위치. 중복 구현 금지.  
**변경:** 카드/검색/하단 탭 라이트 토큰; 핀 접근 가능한 `button`/키보드; `returnToMapWithPlace` 사용 맥락에 따라 **원래 지도 중심·줌·선택** 복귀 vs 저장 장소 지정 이동 의도 분리(#17 D-P0-01).  
**수용:** 320·375·430px, safe-area/모바일 키보드/시트 겹침 없음, Tab/Enter/Space로 핀 선택, 검색 오류/0건 분기.

### C-02. 번역
**변경:** 상단 `←` 44px 독립 버튼 + 제목 아래 `선택한 장소` 정보. 번역 결과 큰 텍스트.  
**유지:** 실제 API/검증된 로컬 문구가 번역에 성공하기 전 TTS/성공 표시 금지. 실패 시 원문 유지, 재시도 버튼. 장소 없을 때 가짜 컨텍스트 붙이지 않음.

### C-03. 환율
**의도:** '부분 실패'는 **이미 검증된 캐시가 있을 때** 가능한 폴백이지, **임의 기본 환율을 만드는 기능이 아닙니다.**
- 정상 응답 & 유효 데이터 → 예상 KRW + 실제 제공처·기준일.
- API 실패 & **검증된 7일 이내 캐시** → 지난 환율로 계산한 금액 + 기준일·공급자·'지난 환율' + 카드 내부 인라인 재시도.
- 캐시 없음/7일 초과/메타데이터 무효 → **예상 금액 미산정**(0원·1:1·추정 기본환율 금지) + '환율 확인이 필요해요' + 바로 옆 재시도.
- **이미 존재:** `getValidatedCachedRates` 7일 유효성, `isStale`, `currency.rate.stale_body`, `currency.result.as_of/source` 재사용.
- **기존 이슈:** #17 D-P1-01('이전에 받은 환율'과 실제 캐시 없음)과 중복 수정 금지.

### C-04. 카메라 → C-05. 결과
```text
CAPTURE_EMPTY
  → 촬영/갤러리 선택(고지 선행)
  → PRIVACY_TRANSMIT_NOTICE / 분석 동의(실제 처리 흐름에 맞게)
  → UPLOADING/ANALYZING
  ├→ REAL_RESULT : 원문·번역·가격 후보, 실제 사진 출처 표기
  ├→ OCR_ERROR   : 같은 이미지 유지·사진 다시 분석 / 다른 사진 선택
  └→ DEMO_RESULT : 샘플 데이터 명시, 실제 사진 결과나 지출로 오인 금지
REAL_RESULT → REVIEW_ACTUAL_EXPENSE → SAVE → WALLET
```
- **금지:** 이미지를 선택한 즉시 고지 없이 제3자 전송, 촬영 전 결과 프리뷰, 분석 실패한 실사진을 임의 샘플 성공 결과로 대체, 메뉴 가격의 지갑 즉시 합산.
- **카피:** `camera.privacy.notice`의 정확한 서버·외부 분석 고지 삭제 금지. 옆에 효익 문장 `camera.privacy.benefit`을 새로 둘 수 있음. 미검증 보존 기간/일시적 분석 보장 금지.
- **모바일:** 촬영 가능 시 화면 하단 폭 전체 Primary ‘메뉴판 촬영’; 앨범은 Secondary. 촬영 미지원 기기에서는 앨범이 Primary가 됨. 안내 텍스트는 촬영 버튼 **앞에서** 읽을 수 있어야 함.

### C-06. 여행 지갑 → C-07. 지출 입력
**현재 코드 위험:** `CameraMenuModal.tsx`의 OCR 결과 `addExpense` 직접 호출, `paymentMethod:'card'` 하드코딩. `TravelContext.safeSetItem`의 저장 오류 무시와 **무조건 성공 토스트**. #17 D-P0-03과 결합해 해결.
```text
[수동 기록] ───────┐
                   ├→ [금액/통화 수정 + 결제 수단(선택) + 날짜/장소(선택)]
[OCR 가격 후보] ───┘                │
                         ↓  [1,200엔 지출 기록하기]
                      중복 감지 / 사용자 선택
                         ↓  로컬 실제 저장 시도
              ┌──────────┴────────────┐
             성공                    실패
    지갑에 포함/성공 메시지        폼·입력값 유지/재시도
```
- 기존 `wallet.form.confirm_actual`의 추가 체크박스 **제거**: 사용자가 최종 CTA를 누르는 행위가 직접 확인. 대신 OCR 결과에서 바로 등록 버튼은 없애고 실제 지출 입력 단계로 이동.
- 결제수단은 카드/현금 **2칩**으로 간단하게. 카드 자동 선택은 사용자가 미리 선호를 저장한 경우만; 그렇지 않으면 **둘 다 미선택(세 번째 '미선택' 칩은 없음)**. 선택하지 않아도 optional/unknown으로 기록 가능하게 설계. 기존 `ExpenseRecord.paymentMethod` required card/cash → 변경은 **기존 스토리지 기록과 호환**되도록 해야 함.
- 금액 입력 중 키보드 바로 위에 '**{{amount}}{{currencyName}} 지출 기록하기**' 스티키 CTA; safe-area/virtual keyboard/GNB 겹침 없게. 금액 유효성 검증 후에만 활성.
- 지출 후: 요약 → 날짜별 목록 → 개별 상세/수정·삭제 확인(전체 삭제와 분리) → 환율 미확인 건은 원래 통화 그대로 보관·원화 합계에서 제외. 수동 기록도 클라우드/카드사 결제 확인이 아닌 **사용자 신고 기록**.
- **영속성:** 저장 실패 시 성공 토스트/폼 닫기/로컬 합계 업데이트 금지, 사용자가 다시 시도할 수 있게 초안 유지; 저장 성공은 실제 `localStorage`에 기록된 이후만.
- **추후:** CSV 내보내기(#16 C-03) 및 영수증 전용 OCR(#16 C-04)는 이번 v3 구현 완료라고 주장하지 않음.

## D. 한국어 카피 최소 델타

이미 PR #11에 구현된 P0 326키 + Phase2 223키는 **그대로 유지**하고 신규 키만 필요한 경우 아래 3개 추가. `camera.privacy.notice`는 반드시 기존 사실 안내와 함께 유지해야 함.

```json
{
  "camera.privacy.benefit": "메뉴판 글자와 가격을 읽어드려요.",
  "wallet.review.open": "지출 내용 확인하기",
  "wallet.form.submit_amount": "{{amount}}{{currencyName}} 지출 기록하기"
}
```

기존 키: `wallet.form.confirm_actual` / `wallet.toast.save_failed` / `wallet.summary.partial` / `currency.rate.stale_body` / `currency.result.as_of` / `currency.result.source` / `camera.action.retry_analysis` / `camera.demo.notice`. 중복 추가 금지. string interpolation 방어(값 없는 placeholder·언어별 통화형 표시) 및 스크린리더 읽기 점검.

## E. A02 작업 배치: PR 변경과 증거 기준

| 우선 | 실제 구현할 것 | 파일 힌트 | A02 완료 증거 |
|---|---|---|---|
| **P0-1 신뢰** | #17 D-P0-03 로컬 기록 실패 감지; OCR 1-click→실제 지출 검토, 샘플과 실제 구분, 결제수단 허위 기본값 제거 | `TravelContext.tsx`, `CameraMenuModal.tsx`, `WalletView.tsx`, `types/travel.ts` | 저장소 예외 테스트 / OCR 후보 저장 전 지갑 합계 불변 / 기존 로컬 기록 호환 |
| **P1-1 테마** | 시맨틱 토큰 적용, 라이트 지도·상단 헤더·하단 nav·테두리 최소화/필드 포커스·아이콘 | `globals.css`, `TravelApp.tsx`, `MapView.tsx`, `Navigation.tsx`, `TranslateView.tsx`, `CurrencyView.tsx`, `SettingsView.tsx` | 320/375/430px 실제 렌더링 캡처, 새 SHA/CI, 키보드·고대비 검사 |
| **P1-2 촬영/금액** | 카메라 촬영과 분석 결과 단계 분리 + 사전 고지, verified-cache 라벨/인라인 retry, 기록 금액 CTA sticky | `CameraMenuModal.tsx`, `CurrencyView.tsx`, `WalletView.tsx` | 선고지/실OCR 실패/valid-cache·no-cache·expired 시나리오별 수동 증거 |
| **P1-3 기록 추적** | 오늘/날짜별 그룹, 상세 수정·개별 삭제 확인, 미환산 부분합계 표시 | `WalletView.tsx`, `TravelContext.tsx` | 수정/삭제/취소/불변성/중복 테스트 |

**회귀 필수**: 기존 5탭·지도 중심/줌·장소 선택, 올바른 환율 원천, 번역 STT/TTS 실패, 카메라 개인정보 고지, i18n 계약, 320/375/430 폭·200% 확대·키보드/safe-area, 강제 `localStorage` 실패, 다통화 내역의 부분합계. 외부 API·카메라·마이크 실단말/A04 독립 QA는 따로 `NOT_TESTED` 기록.

**운영:** 오너 승인 없는 `main` 병합/공개 배포/파괴적 변경/새 유료 API 비용 발생 금지. A04 QA `PAUSED_BY_OWNER`. 이 브랜치는 **시각 자산·명세 전용**, 앱 동작 코드를 수정하지 않습니다. A02가 현재 작업 PR로 선택 병합하거나 참고 링크를 붙여 개발하면 됩니다.

## F. 원본 업무 연결
- [오너 확정 v2 방향 및 지출 기준 #14](https://github.com/Junebooky/travel-os/issues/14#issuecomment-6234831418)
- [오너 TDS 유사 UX 세부 피드백을 반영한 최신 v3 스펙 #14](https://github.com/Junebooky/travel-os/issues/14#issuecomment-6234947048)
- [A02 개발 이슈 #15](https://github.com/Junebooky/travel-os/issues/15)
- [중복 제거 P0/P1 #17](https://github.com/Junebooky/travel-os/issues/17#issuecomment-6234488936)
- [공동 보드 #13](https://github.com/Junebooky/travel-os/issues/13)
