# A02 CURRENT IMPLEMENTATION INDEX — Mint Brand + Animated Welcome

> **CURRENT OWNER DECISION · 2026-10-19:** Option A, new animated Welcome/Travel Home separate from map, and **all existing UI blue accents switched to mint**. The older pure-white/flags/provider behavior requests remain.  
> **Primary full implementation instructions:** [A03-WELCOME-MINT-V1.md](./A03-WELCOME-MINT-V1.md)  
> **Latest token / SVG / navigation index:** [README.md](./README.md) · [nine mint-recolored reference screens](./white-ui-v3-overview.svg)  
> **Settings country draft-confirm and owner asset plan:** [A02-COUNTRY-PICKER-IMPLEMENTATION.md](./A02-COUNTRY-PICKER-IMPLEMENTATION.md)  
> **Status:** DESIGN_ONLY; actual PR #11 code merge, CI and mobile render are separate.

## Preserve these previously approved requirements

1. **Translate top bar:** source and target each display real corresponding country flag beside real language code and label, swap state/translation/TTS stay consistent, long labels fit 320px, keep white panel and necessary `#E5E8EB` border. `TranslateView.tsx`.
2. **Currency top bar:** from/to currency national flag icons and symbols derived from selected currencies, correct on swap. `CurrencyView.tsx`.
3. **White UI canvas:** all regular screen/card/input/button backgrounds `#FFFFFF` except actual solid primary button mint, official country flags and genuine content imagery/map. No old cool-gray surfaces or gratuitous pastel mint containers.
4. **Provider name not shown as requested:** no visible `제공: open.er-api`; do not delete internal provider/source/date integrity info or required third-party licensing attribution. Keep real basis date and stale feedback.
5. **Settings Owner v4**: current `CountryPickerModal.tsx` already has draft→confirm; keep `여기로 여행갈까요?` above `닫기`, commit only on confirm. Keep actual 16:9 travel hero `/assets/setting_tab/travel_setting.png` with **dynamic country flag/name**, hero upper-right white pill `여행 정보 수정`. Do not replace the user's existing PNGs with AI-generated pictures.
6. **Mint replacement:** update old `#1B64DA` interactive chrome to `#087F8C`, scene illustration uses `#13C2D6`. Maintain readable white button text contrast, no mint/10 chip tints, no generic multi-hued gradients. Update `globals.css`, JSX classes, primary buttons, selected map pins, nav, focus, onboarding, camera, wallet, FX, voice, settings and modals. `#1554B8`/`#1652B5` blue hover classes must not linger.

## A02 quick action checklist

- **A (brand foundation):** `src/app/globals.css`, `TravelApp.tsx`, `Navigation.tsx` semantic tokens. Do not rely only on root vars while JSX contains hardcoded blues.
- **B (new Option A Welcome):** create `AnimatedWelcome.tsx` separate from existing 4-step `Onboarding.tsx`; real country context and functional shortcuts to Map/Translate/Currency/Wallet; new welcome never reappears on tab switches, restores deep-link task when appropriate; use only 2–3 transform-animated decorations, reduced motion must be static. No mascot/extra 24-country/demo FX logic by default.
- **C (recolor current features):** map/translate/currency/wallet/settings/camera/voice/from the existing component files. Reuse all implemented safety and data handling, avoid rebuilding working country selection flow.
- **D (proof):** new PR #11 full SHA + lint/TS/tests/build + actual mobile screenshots Welcome/5 tabs/country modal at 320/375/430 and 200% text/reduced motion tests; mark per-screen DONE/PENDING.

**No unauthorized main merge / deploy / paid APIs / data destructive changes. A04 QA paused.**

---

### Historical directive supersession
Earlier GitHub descriptions called the brand **One Blue `#1B64DA`**. That is no longer the latest owner preference. For compatibility, the filenames `white-ui-v3-overview.svg` and `images/*.svg` remain stable, but the source files' **current contents use mint**, while previous commits remain historical only.
