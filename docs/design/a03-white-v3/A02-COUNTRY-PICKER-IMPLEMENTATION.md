# CURRENT A03 UX v4 — Settings redesign + explicit country confirmation

**2026-10-18 KST | OWNER REQUEST / A03 DESIGN & PLAN → A02 EXECUTION / A01 STATUS**  
**State: DESIGN_PLAN_READY · A02_CODE_PENDING · NO_IMAGE_GENERATION**  
**Important supersession:** This file **replaces** the earlier behavior recommendation that tapping a country should call `setCountry(c)` and automatically close. **That earlier behavior is rejected by the owner.** Owner's supplied settings-screen reference and travel-hero/button reference take priority over earlier `08-settings.svg` and `09-country-picker.svg` imagery where they conflict; the existing SVGs are legacy visual examples until their contents are synchronized. No new illustration should be generated—use the owner's actual assets.

## 0. Verified repository facts / avoid invented asset completion

- A02 development: [PR #11](https://github.com/Junebooky/travel-os/pull/11), HEAD verified when authoring: `fd5cd74658f0e3f17bc6d247270b16c613363663`, branch `feat/track-b-phase2-extensions`.
- Parent screen: `src/components/SettingsView.tsx` (~lines 89–245); country picker is `src/components/CountryPickerModal.tsx` (179 lines).
- **Current bug:** `SettingsView.tsx` country-picker `onSelect` (~line 259–263) immediately invokes `setCountry(nextCountry)`, `setIsCountryPickerOpen(false)`, and shows a toast. `CountryPickerModal.tsx` card `onClick={() => onSelect(c)}` closes due to that parent callback. It already displays 8-country spherical flags in 3 columns. **Do not reimplement the existing grid/flag component.**
- **CONFIRMED:** `public/assets/setting_tab/travel_setting.png` exists at PR #11 branch and is **1920×1080 (16:9)**. This is the approved hero background asset.
- **NOT FOUND on current GitHub dev branch at requested paths:** `public/assets/setting_tab/saved_setting.png`, `public/assets/setting_tab/download_setting.png`, `public/assets/setting_tab/travel_os.png`. The owner has created them, but **they must be added to the actual repo/public path before A02 can truthfully claim those illustrations are wired**. Do not invent, regenerate, replace with AI images, or pretend these already exist. Ask owner/A01 to share/commit missing assets if they are not present in A02's actual working tree.
- The user mentioned `travel_os.png` twice; treat it as **one Travel OS card asset**, not two files.
- `src/data/countries.ts` has JP / US / FR / TW / TH / VN / GB / IT; continue using this single source of truth.

## 1. P0 — Country picker: 2-step selection and confirmation

### Desired behavior (owner's exact words)
Country-card tap should **only preview** selection and never close the screen. Add a large primary button **`여기로 여행갈까요?`** **directly ABOVE `닫기`** in the sticky safe-area footer. The active draft country's blue outline/check changes immediately. Only the primary button commits the destination.

```txt
Settings
  └ tap "여행 정보 수정" [hero upper-right]
     └ open CountryPickerModal
        ├ initialize draftCountryCode = actual country.code
        ├ tap JP/TH/etc ⇒ draftCountryCode changes; modal stays OPEN
        ├ tap another ⇒ draft changes again, still NO context/persistence updates
        ├ confirm [여기로 여행갈까요?]
        │  ├ if draft differs: resolve COUNTRIES.find(code) and call existing setCountry ONCE
        │  ├ update actual country/lang/currency/map through existing context mechanics
        │  ├ close modal and show truthful success UI
        │  └ if unchanged: close without unnecessary mutation (no misleading 'changed' toast)
        └ cancel [닫기] / Escape ⇒ discard draft, close, no toast, retain original country/lang/currency/map
```

### State/implementation contract
- `CountryPickerModal.tsx` **local state** `draftCountryCode`; reset to `selectedCode` every time `isOpen` becomes true. Do not use the currently persisted country as the *draft* after a user taps other options. On an external country change while picker is open, choose safe synchronization / explicit review before overwriting draft.
- `CountryPickerModalProps`: replace auto-commit `onSelect(country)` semantics with `onConfirm(country)`; `onClose()` cancels. Keep controlled `selectedCode` as committed selection for initial state. The event handler on country card becomes **`setDraftCountryCode(c.code)` only**.
- Render checked tile `draftCountryCode===c.code` with existing `#1B64DA` border and checkmark; ARIA label of card reflects **currently being previewed**, not saved setting. Use `aria-pressed` or single-select radio semantics consistently.
- Sticky footer stacked: **Primary full width `여기로 여행갈까요?`**, then **secondary `닫기`** (the bottom-most button), both min height 52px, 12–16px gap and `env(safe-area-inset-bottom)` padding. `닫기` is enabled; PRIMARY not disabled when selected=original, because confirming same country is legitimate (just close without changing).
- Optional small status immediately above CTA: `선택한 여행지 · {{countryName}} ({{countryCode}})` helps users confirm; keep this UI source from draft state, not app context. Avoid duplicative travel content cards that bury footer at 320px height.
- If parent `onConfirm` encounters a real persistence failure, do **not** falsely claim successful saving. Current `TravelContext.setCountry` returns void and calls `safeSetItem` without surfacing failures. A02 should assess and, if needed, introduce backward-compatible verified persistence/failure handling, while preserving existing map and language reset semantics. Avoid blocking interface solely on unknown success while displaying an untrue toast.
- Don't clear saved places/expenses when previewing countries. Map viewport/target language/currency changes should occur only at confirmed commit, preserving existing country-switch behavior.
- Focus trap + focus restoration to hero '여행 정보 수정' control; Escape behaves like `닫기`. 320/375/430 viewport, 200% font, short-height scroll, onscreen keyboard/safe areas.

**New i18n entries (use existing P0 keys where appropriate):** `settings.country_picker.confirm = "여기로 여행갈까요?"`; `settings.country_picker.selected = "선택한 여행지 · {{countryName}} ({{countryCode}})"`. Existing `common.action.close` retained. Use existing `settings.travel.saved/failed` where they accurately describe the actual result.

## 2. P1 — Settings main screen reference matching, with owner's assets

**Design authority:** Owner's first supplied full-page reference (settings screen) + second supplied 16:9 hero/button reference. Use their composition/spacing but do not blindly copy illustrated text or place flags inside a background image. **Do not generate any new images.**

### A. Page architecture: top to bottom
1. **Header:** large `설정` title, small `내 여행과 저장 데이터를 관리하세요` subtitle on **pure-white canvas**. Keep the settings tab selected in 5-tab nav.
2. **Country hero (dominant first card):** use exactly the actual background **`/assets/setting_tab/travel_setting.png`** from `public/assets/setting_tab/travel_setting.png`. Image MUST retain **16:9 frame** (`aspect-video`, correct `object-fit:cover` within ratio, no stretched portrait clipping). Rounded image + gentle shadow. Overlay **current React `country.flag` / `country.name` / `country.code`** on a text-safe left area; show `여행할 나라` below. **DO NOT bake Thailand, Thai flag, title or country code into the PNG.** Changing destination updates text/flag without image editing.
3. **Hero action button placement is critical:** one floating/pill **WHITE CTA AT HERO UPPER RIGHT** `⚙ 여행 정보 수정 ›`, using the owner-provided second reference's size/shape/position; this **replaces** the old little `여행 설정 바꾸기` button placed beside country name. Text + icon live React button (not static pixel). Min 44px hit area, background `#FFFFFF`, text/action icon `#1B64DA`, readable over artwork, overlay positioned with inset 12–16px. On narrow 320px, if upper-right button conflicts with left title, reserve an artwork-safe zone or use a compact responsive label—not overlap. This button opens the country picker (does not change country).
4. **Saved Places:** white rounded horizontal information card: left `/assets/setting_tab/saved_setting.png`, title `저장한 장소`, reactive `{{savedPlaces.length}}개` count, concise helper, right chevron; tapping uses existing `SavedPlacesModal`. Do not hardcode 0.
5. **App Install:** white rounded card: left `/assets/setting_tab/download_setting.png`, `앱 설치` title and readable explanation, right-side bright brand-blue `앱 설치` button when actual browser install prompt exists. **Keep existing iOS '홈 화면에 추가' instructions, `isStandalone` installed state and unsupported-browser fallbacks**; do not display clickable install action if it cannot work.
6. **Saved Information / deletion:** separate white card with existing storage/trash icon unless owner supplies a dedicated one, `저장된 정보`, accurate device-local deletion description, explicit `저장된 정보 삭제` action. Preserve existing `isConfirmResetOpen` irreversible-action confirmation. Do not invent deletion/backup claims.
7. **Travel OS:** white card, left **`/assets/setting_tab/travel_os.png`** (single source), `Travel OS` title and actual version value, concise privacy/processing explanation and accessible expanded details. The image should use `object-contain` rather than distortion.
8. **Five-tab GNB:** 지도 / 번역 / 환율 / 지갑 / 설정 unchanged, settings selected, accessible controls.

### B. Surface and image rules
- Background pure `#FFFFFF`, brand blue only `#1B64DA`; text primary `#191F28`, secondary `#4E5968`; optional neutral border `#E5E8EB`. No `#F2F4F6` decorative fills or random orange accent buttons. **Owner's existing illustration/flag intrinsic colors are content, not added UI theme colors.**
- Horizontal card icon art use `width:68–88px` with `object-contain`; content text 14–17px and 1.4–1.6 line height. Hero button 13–15px label; on 320px use wrapping/truncation-safe layout. Card radii approx 18–24px, spacing 12–16px, subtle real shadows (not huge dark borders).
- The hero artwork **is the scene**. Do not add a second generated globe, unrelated country-specific asset, or extra overlay gradient without verifying contrast on all countries. If asset itself includes baked country labels/button, document and avoid duplicate UI layers; the saved country name/flag MUST remain code-driven.
- Use `next/image` or an equivalent local asset renderer with defined size for layout stability, proper alt for meaningful illustration, `aria-hidden` for purely decorative. If file missing, graceful semantic fallback + report `ASSET_PENDING`, don't block critical settings actions or quietly substitute a newly generated picture.
- The hero background is shared for all countries **as explicitly instructed by the owner**; don't pretend that a Thailand-looking landscape dynamically switches to Japanese imagery unless future country-specific art is provided.
- Existing settings Quick Badges '현지 언어/현지 통화' can be relocated to an accessible compact details row below hero, **not lost**. Keep `targetLang`, `localCurrency` derived from actual state.

### C. Exact asset mapping / readiness
| Owner-provided name | Browser/Next.js source when present | GitHub dev-branch verification | Intended use |
|---|---|---|---|
| `assets/setting_tab/travel_setting.png` | `/assets/setting_tab/travel_setting.png` | **FOUND** at `public/assets/setting_tab/travel_setting.png`, **1920×1080** | Static 16:9 hero background **only** |
| `assets/setting_tab/saved_setting.png` | `/assets/setting_tab/saved_setting.png` | **NOT FOUND** at expected `public` path (this branch) | Saved Places card icon |
| `assets/setting_tab/download_setting.png` | `/assets/setting_tab/download_setting.png` | **NOT FOUND** at expected `public` path (this branch) | App Install card icon |
| `assets/setting_tab/travel_os.png` | `/assets/setting_tab/travel_os.png` | **NOT FOUND** at expected `public` path (this branch) | Travel OS card icon |

**A02 asset task:** obtain owner-created three missing PNGs from actual project workspace/owner; commit them to `public/assets/setting_tab/` with exact names. Verify bytes, actual file case and that URLs load in built app. Do not create AI replacements. If not provided, implement layout + safe existing Lucide/icon fallback and mark artwork `BLOCKED_BY_MISSING_ASSETS`. **The above path uses Next.js public URL mapping**, no `/public` prefix in component `src`.

## 3. Component-by-component A02 work batches

| Priority | File(s) | Exact change | Proof |
|---|---|---|---|
| **P0 immediate** | `CountryPickerModal.tsx` + `SettingsView.tsx` | draft selection state, footer CTA above close, parent onConfirm only, cancel discard, existing context country switch once | Tap several countries, modal stays; close discards; confirm commits once |
| **P1 hero** | `SettingsView.tsx` + optional `TravelHeroCard.tsx` | 16:9 `travel_setting.png` and dynamic flag/name/code; **upper-right** white pill `여행 정보 수정 ›` | TH/JP/FR selection changes overlay, hero art ratio preserved, 320–430px |
| **P1 cards** | `SettingsView.tsx` | owner's saved/download/travel_os assets, live count, install state, storage confirm, legal data explanatory copy | missing assets handled honestly, current actions keep working |
| **P1 content** | `src/locales/ko-KR.json` (plus existing i18n mapping) | new exact CTA/labels; existing keys maintained | no raw missing interpolation placeholders |
| **P1 verify** | Tests & PR #11 new SHA | iPhone/Android-sized viewport, 200% zoom, semantic selection/focus/ESC, PWA state, map/lang/currency propagation, original saved data unchanged | screen captures + CI link and task status |

## 4. Acceptance / definition of done

- [ ] Selecting a different country in modal changes **draft highlight only**, not underlying Settings page/target language/currency/map. Multi-tap selection stays open.
- [ ] Primary `여기로 여행갈까요?` button **above** secondary `닫기`; buttons remain reachable with short heights and system safe area. Confirm one time commits; Cancel/ESC/outside dismissal no change. Reopen shows current committed country selected.
- [ ] Selected draft label and blue check are visible and screenreader accessible; 8 real countries remain correct; 320/375/430px and 200% text acceptable.
- [ ] Settings hero is **16:9 actual owner PNG** with dynamic selected flag/name/code, top-right **white** `여행 정보 수정` pill with gear + right chevron; no hardcoded `태국` or `TH` in layout.
- [ ] All three owner-made supporting PNGs are physically present at the verified `public/assets/setting_tab/` path and used in correct cards **or explicitly marked ASSET_PENDING** until supplied. No silent new illustration generation.
- [ ] Saved Places count and navigation, App Install actual availability, device data reset confirmation, and Travel OS privacy copy still function. Language/currency/map update only on confirm.
- [ ] PR #11 real new full SHA, lint/typecheck/tests/build CI, actual 320/375/430px Settings/picker captures, and comparison with owner screenshots. Design doc alone `NOT_IMPLEMENTED`.

**Release guardrails:** No unauthorized main merge/public deploy, destructive schema changes, new paid UI libraries; A04 QA `PAUSED_BY_OWNER`. A03 can assess visual gaps when A02 reports, but does not claim code merged.
