# A03 CURRENT · Travel OS Animated Welcome + Global Mint Rebrand · 2026-10-19

> **OWNER APPROVED DIRECTION:** Option A (separate Welcome/Travel Home) + replace existing blue branding throughout app with mint.  
> **A03 → A02 implementation handoff; A01 owner visibility.**  
> **Status:** `DESIGN_SYSTEM_SPEC / IMPLEMENTATION_PENDING`. This is a designer's plan and developer contract, **not** a claim that app code, testing, or production has changed.  
> **Source:** user-supplied React prototype `붙여넣은 텍스트(1).txt` (not a GitHub dependency). Selectively borrow `FloatingCube` (source ~92–106) and `floatSlow` animation (~415–420), NOT the prototype's hardcoded currency, demo place, voice, or wallet behaviors.

## Decision summary (one-minute read)

- **Option A / separate screen:** `AnimatedWelcome` is a new *entry stage*, NOT a sixth bottom tab and NOT a replacement for the interactive map. Preserve **지도 · 번역 · 환율 · 지갑 · 설정** as the 5-tab product.
- **Global mint rebrand:** entire app's interactive/selected brand chrome from `#1B64DA` (or its old hover `#1554B8`/`#1652B5`) → **accessible primary mint `#087F8C`**. White canvas `#FFFFFF`, main text `#191F28`, secondary `#4E5968`, essential borders `#E5E8EB`. Keep illustration/flags/map tile data as content.
- **Bright animated scene:** source prototype's `#13C2D6` **only within Welcome hero/illustrative area** as background/decorative mint, not a secondary UI CTA color and not a pastel fill behind every card. The sample's `#0A99A8` is a creative reference, NOT a second button/link token. Avoid pink/orange/purple/amber ornamental brand colors.
- **Contrast/accessibility reason:** white text on `#13C2D6` has ~2.16:1 contrast, on `#0A99A8` ~3.42:1, on `#087F8C` ~4.75:1. **White CTA text must use `#087F8C` or darker**. On bright hero scene use dark `#191F28` text or an actually verified text-safe white surface; never assume white text is legible. `#13C2D6` with dark `#191F28` is ~7.66:1.
- **Do NOT wash brand down:** no `mint/10`, `mint/20` UI backgrounds, multicolor gradients on buttons, or tinted boxes across app. Primary CTA solid mint, secondary CTA white+neutral stroke+dark text; selected tab/selected pin exactly mint.
- **No invented product data:** prototype's `rateToKRW` hardcoded numbers, `INITIAL_PLACES` mock reviews/maps, simulated 2-way conversation/TTS, immediate OCR-to-wallet storage, faked install success and route toast are NOT production references.

## 1. IA & state architecture (must preserve existing behavior)

```
INITIAL APP LAUNCH
├─ Existing first-run country/language/currency onboarding NOT COMPLETED
│  └─ Current Onboarding steps (reuse, do not duplicate country selection)
│      └─ completion → AnimatedWelcome
└─ Existing travel setup COMPLETE
   └─ AnimatedWelcome (first entry of current app launch)
       ├─ [지도에서 시작하기] → Map tab / map context preserved
       ├─ [바로 번역] → Translate tab / existing source+target selection
       ├─ [환율 계산] → Currency tab / actual verified rates
       ├─ [여행 지갑] → Wallet tab / real saved transactions only
       └─ [건너뛰기] → Map tab immediately
           └─ Persistent 5-tab app (DO NOT show Welcome on each tab switch)
```

**Entry semantics:** Welcome may be displayed **once per app startup**, but never on ordinary tab changes, map/back, photo capture, FX retry, or an expense save. Avoid displacing a deep-link or restored active task: when a user opens a deep link to a place/task, honor it and **skip Welcome**. If navigation state is restored on an app resume, do not unexpectedly replace it with the Welcome screen. Expose a lightweight `Welcome 다시 보기` option from Settings or brand/header later without adding a sixth nav tab. Consider a `Welcome 건너뛰기` preference only when reliable persistence is already available; it must be optional and must not gate the trip.

**State owner:** `TravelApp.tsx` handles new `'welcome' | 'tabs'` stage after `onboardingCompleted`; do not add a fake new country/context store or reset the current selected country, saved places, expense records or map viewport. `useTravel().setActiveTab` remains the real navigation setter. Server/hydration/PWA check should not flash one stage then replace another; the existing `useSyncExternalStore` hydrate guard is useful.

## 2. Welcome layout — reference-derived interaction, Travel OS design

### 390×844px target; responsive 320/375/430px

| Region | Recommended appearance and copy | Developer behavior |
|---|---|---|
| A. Header | `TRAVEL OS` wordmark / right dynamic pill `🇹🇭 태국 여행` | country label derives from `country.flag` and `country.name` |
| B. Motion scene | A large **mint-rich, bright welcome hero**; 2–3 floating **travel clay assets** (globe, suitcase, plane/passport) using owner-approved existing images when available. Optional user-prototype small SVG cube as decoration, NOT 5 busy cubes. | animation decorative only; `aria-hidden`, `pointer-events-none`; never intercept touch or cover title/CTA |
| C. Main headline | **`여행, 어디서부터 시작할까요?`**, supportive `필요한 순간, Travel OS가 함께해요.` | high-contrast, readable with reduced motion and while assets haven't loaded |
| D. Primary action | **`지도에서 시작하기`** on solid `#087F8C` with white label | enter 5-tab shell, map tab active, honor existing map context (no reset) |
| E. Shortcuts | **`바로 번역` · `환율 계산` · `여행 지갑`** (neutral white buttons) | deep-link to actual existing tab without placeholder toast |
| F. Secondary | `건너뛰기` as understated visible text action; accessible | enter real map tab immediately; 44px hit region |
| G. Device support | White app background remains; motion stays inside hero visual, top safe area and bottom CTA safe area respected | landscape/low-height content scroll; no hidden CTA |

**Dynamic copy:** destination pill and greeting may use `country.name`, `country.code` and current verified language but must not show assumed time, fabricated weather, fictional rates or user spending. Do not inject user name or fabricated destination photos.

## 3. Motion contract (progressive enhancement)

- Move **only the decorative artwork**. Suggested simple `floatSlow` from provided React: transform translateY(0→-6→0px), rotate(0→~2°→0), 5–7 seconds, easing in/out, objects staggered via CSS negative delays. Respect user preference for reduced motion: `@media (prefers-reduced-motion: reduce) { animation: none; transition: none; }`.
- Avoid animating position via layout/top/left, heavy blur, giant compositing layers, scroll-bound parallax, on-screen buttons or route-critical labels. Use GPU-friendly transform, no endless JS timers, network 3D engines, new paid animation packs, or autoplay sound.
- Keep 2–3 illustrations **max**. Object placement responsive, cannot cover headline or CTA. If none of the required existing art exists yet, implement text-first functioning Welcome with CSS/no new generated art and mark `ART_ASSET_PENDING`.
- On midrange Android/mobile Safari/PWA, target visually smooth motion without claiming measured FPS before profiling; test long-running foreground and resumed state, battery/reduced motion. Hero always works as a **static picture** if animation is disabled or not loaded.

## 4. Mint tokens / application-wide screen matrix

```css
:root {
  --os-background: #FFFFFF;
  --os-surface: #FFFFFF;
  --os-text: #191F28;
  --os-muted: #4E5968;
  --os-border: #E5E8EB;
  --os-brand: #087F8C;        /* primary readable mint / CTA / selected state */
  --os-welcome-scene: #13C2D6; /* decorative Welcome artwork only */
}
```

| Current screen / surface | Old behavior/design target | New mint treatment, functional exclusions |
|---|---|---|
| Welcome (new) | No separate animated stage beyond 4-step setup | mint hero + floating travel art, reliable map/translate/FX/wallet links |
| Onboarding | Blue step indicators/buttons and outlines | global solid mint on selected, progress, primary CTA; keep 4-step onboarding logic |
| Map | selected category chip, map pin, search focus, navigation buttons blue | **mint exactly on app chrome selected state**, preserve OSM actual tile colors and selected map, current controls/search/zoom |
| Translate | text/voice/camera CTA, source/target flag selectors, focus blue | mint CTA/swap/focus/selected; **national flag colors unchanged**, keep translation integrity and photo privacy disclosure |
| Currency | refresh action and active choices blue | mint button/link/selection, same confirmed rate, date/staleness and no fabricated/default FX conversion; no visible provider label if owner's previous requirement persists |
| Wallet / Expense | add/save CTA, payment choices, focus blue | mint button/selected chips; **never auto-record OCR menus as expenses**, no lost unsaved drafts, preserve partial totals and original currency |
| Settings | hero upper-right white pill with prior blue icons/text; picker country blue check/border; install action | mint text/icon/check/border and relevant install action; **keep owner 16:9 PNG and country flag/name as dynamic code**, country picker draft-confirm flow |
| Navigation | bottom 5-tab selected blue | selected label/icon/focus **mint**, white background, same 5 routes and existing clay icons |
| All modals | blue focus rings, close/primary styles, privacy, reset confirmation | consistent mint on primary and selected/keyboard focus, white neutral surfaces; deletion stays explicit with real confirmation |

**A02 must actually search replace:** `#1B64DA`, `#1554B8`, `#1652B5`, `shadow-blue-*`, `focus:ring-[#1B64DA]`, explicit opacity tints, and remaining `--primary-blue`. Do NOT blindly replace every blue occurrence: country flags, travel hero photography, existing clay art and live map tile colors are content. Avoid code-time global CSS hacks that recolor third-party tiles, flags or photos. Centralize semantic tokens where practical so a future brand change won't require hundreds of brittle replacements.

**Important CSS accessibility:** solid `#087F8C` + white foreground qualifies ~4.75:1. Focus indicators must be visually distinct on both white and brand backgrounds (2px focus stroke + offset, keyboard-only). Secondary labels default dark neutrals.

## 5. Priority/code mapping (A02)

- **Batch A — rebrand foundation:** `src/app/globals.css` + app shell `TravelApp.tsx`; 5-tab `Navigation.tsx`; reusable shared action/selected/focus styles. Screens should not retain outdated blue. Keep all `#FFFFFF` base surfaces.
- **Batch B — new Welcome stage:** `src/components/AnimatedWelcome.tsx` (new) and `src/components/TravelApp.tsx` stage transition; reuse `TravelContext` selected destination and existing `Onboarding.tsx`. May add `src/styles/welcome-motion.css` only if needed; no external animation dependencies.
- **Batch C — screen color consistency:** `MapView.tsx`, `TranslateView.tsx`, `CurrencyView.tsx`, `WalletView.tsx`, `SettingsView.tsx`, `CountryPickerModal.tsx`, `CameraMenuModal.tsx`, `VoiceChatModal.tsx`, data/permission/error modals.
- **Batch D — UX QA:** screenshots and evidence for Welcome + all 5 tabs, country settings picker, FX & expense, accessibility, 320/375/430px, 200% text, 375×667 short viewport, PWA safe area, reduced motion, app resume/deep link, no unintended navigation resets.

**Existing A02 PR #11 HEAD at design time:** `fa076724e3beed26e6f1c7a4bdde264c3af10ae2`; repo `Junebooky/travel-os`, branch `feat/track-b-phase2-extensions`. A02 should refresh SHA before coding because the branch may change independently.

## 6. Required acceptance evidence / status

- [ ] Brand tokens applied to *actual app code* (not merely SVGs) and screenshots show no prior `#1B64DA` interactive brand blue across 5 tabs, onboarding and all relevant modals.
- [ ] Brand distinction: scene mint `#13C2D6` is not used as white-text button background; solid mint `#087F8C` passes WCAG AA contrast with white (~4.75:1).
- [ ] Welcome first entry and at least 4 direct actions work with real navigation; ordinary tab changes do not reopen Welcome.
- [ ] No fake date/rate/translation/expense/in-app install success from supplied demo. Existing maps and country selection state survive.
- [ ] Motion is subtle and static under reduced-motion; a failed art download does not block CTA; static screenshot sufficient when motion disabled.
- [ ] 320/375/430px screenshots and 200% text with CTA/keyboard/focus/safe area checks; A02 new full commit SHA + CI link; actual performance/reduced-motion checks.
- [ ] `main` merge, production deployment, new paid services, data-destructive changes require owner authorization. A04 final QA remains `PAUSED_BY_OWNER`.

### Short A02 reporting format
```
보고: [발신:A02 → 수신:A03(디자인 비교), A01(오너 현황)] [Mint rebrand A/B/C/D] [DONE/PENDING + full SHA/CI]
위치: [PR #11 code/CI] · [running app captures 320/375/430/reduced-motion] · [visual gaps]
```

**Owner action:** approve visual direction already given (Option A + mint). No additional owner approval gate is needed to **start non-destructive design/dev work**. A03 will compare the actual screen after A02 submits it. This document supersedes prior One-Blue guidance and is the current Mint rebrand authority.
