# Travel OS · CURRENT A03 DESIGN SOURCE · Mint Welcome + 5-tab App

> **LATEST OWNER DECISION · 2026-10-19 (KST)**  
> **Option A:** introduce a **separate animated Welcome/Travel Home screen**, retain original **5-tab app**, and **rebrand interactive app chrome from blue to mint**.  
> **THIS README REPLACES PRIOR ONE-BLUE THEMING DIRECTIONS.** Old GitHub comments/commits are historical proof, not current implementation instructions.  
> **A03 DESIGN SPEC COMMITTED / A02 REAL CODE + CI PENDING / A04 QA PAUSED_BY_OWNER**.

## 1. First read (single source of truth)

1. **[A03 Welcome + Mint rebrand master implementation spec](./A03-WELCOME-MINT-V1.md)** — new entry stage, prototype-inspired floating decor, IA/state, tokens, contrast, exact A02 files and tests.
2. **[A02 existing Settings v4/country-confirm/owner image plan](./A02-COUNTRY-PICKER-IMPLEMENTATION.md)** — still current for Settings logic and owner's actual travel banner/icon assets. **Do not revert already-implemented country draft-confirm behavior.**
3. **[A02 prior four white/flag/provider functional requirements](./A02-IMPLEMENTATION-PROMPT.md)** — prior requests remain in effect *except* superseded blue colors. Source language/FX selectors show correct national flags, all UI surfaces stay white, and no visible “제공: open.er-api” label subject to data-license obligations.
4. **[Nine legacy app-screen/state reference SVGs, now recolored to mint](./white-ui-v3-overview.svg)**. These show screen flow and brand **accent** only; **08-settings.svg is older than the owner's two Settings references**. Do not implement its older layout instead of the newest Settings v4 plan. The *new Welcome* is specified text-first and awaiting actual animation/code; there is **no fake rendered Welcome asset** to confuse with an implementation screenshot.

**Design branch:** `design/a03-white-ui-v3-visual-handoff-20261018` · [Draft PR #18](https://github.com/Junebooky/travel-os/pull/18).  
**Development branch:** `feat/track-b-phase2-extensions` · [A02 PR #11](https://github.com/Junebooky/travel-os/pull/11). Current draft PR is **design files only**; never treat it as evidence that localhost has changed. Owner must authorize merging `main`/public deployment.

## 2. CURRENT brand foundation

| Role | Token | Use |
|---|---|---|
| **Accessible brand mint** | **`#087F8C`** | all real buttons, active bottom-nav label/icon, map selection pin, selected country border/check, selected chip, accessible focus indicators |
| **Bright mint visual** | **`#13C2D6`** | Welcome hero/illustrative background and floating decorative art ONLY; not a white-text small CTA |
| Screen/card surface | `#FFFFFF` | existing owner-approved all-white theme; no former `#F2F4F6` fills |
| Main text | `#191F28` | labels/titles |
| Supporting text | `#4E5968` | subtitles, helper/error text |
| Necessary stroke | `#E5E8EB` | distinguish white-on-white controls, not excessive card framing |

### Accessibility and history
- Contrasts with white text: `#087F8C` ≈ **4.75:1**, `#13C2D6` ≈ **2.16:1**. Use the accessible mint for text-bearing CTA/selection. Use dark `#191F28` on decorative bright mint area, or a real high-contrast white panel.
- Past brand **`#1B64DA` is SUPERSEDED** for interactive chrome. Past hover shades `#1554B8`, `#1652B5` and `shadow-blue-*` likewise need A02 replacement. We **do not** tint UI cards with pale mint (mint opacity/10), add random orange/pink/green UI brand accents, or recolor real **country flags/OSM maps/owner photographs/clay art**.
- No extra source of truth: future changes to this design should overwrite affected SVGs **at the same paths**, this README, master mint spec, storyboard, and direct A02 implementation message. Remove obsolete stand-alone designs from current branch HEAD rather than accumulate `final-final` assets; preserve Git historical commits.

## 3. Current individual app UI references

| ID | Existing screen/state SVG (accent already switched to mint) | A02 code owner/notes |
|---|---|---|
| 01 | [Map](./images/01-map.svg) | `MapView.tsx` / real location and map tile colors retained |
| 02 | [Translate](./images/02-translate.svg) | `TranslateView.tsx` / country flags + true translation direction; photo/voice privacy |
| 03 | [Currency](./images/03-rate.svg) | `CurrencyView.tsx` / currency flags, verified rate/date/provider stored internally, no fabricated FX |
| 04 | [Camera capture](./images/04-camera-capture.svg) | `CameraMenuModal.tsx` / pre-send photo disclosure |
| 05 | [Camera result](./images/05-camera-result.svg) | `CameraMenuModal.tsx` / OCR result not automatically actual expense |
| 06 | [Wallet](./images/06-wallet.svg) | `WalletView.tsx` / valid expenses only, partial total disclosure |
| 07 | [Expense input](./images/07-expense.svg) | `WalletView.tsx` / keyboard-friendly sticky CTA and persistence failure truth |
| 08 | [Old Settings composition, COLOR ONLY current](./images/08-settings.svg) | **NOT approved layout**; use [Settings v4 owner asset plan](./A02-COUNTRY-PICKER-IMPLEMENTATION.md) for actual settings layout |
| 09 | [Country chooser](./images/09-country-picker.svg) | `CountryPickerModal.tsx` / draft choice, `여기로 여행갈까요?` confirms, `닫기` cancels |

**Plus new Welcome (distinct stage, not 6th tab):** [spec and motion storyboard in text](./A03-WELCOME-MINT-V1.md). The older `white-ui-v3-overview.svg` title/path is retained solely to keep existing GitHub links stable, **but its latest file contents have been mint-recolored**.

## 4. Product truth is non-negotiable

- Existing flow: first-run onboarding → new optional/entry Welcome → `지도` / `번역` / `환율` / `지갑` / `설정`. No double country chooser; app should not interrupt deep-linked/restored tasks with Welcome.
- Do **not** lift the user-supplied prototype's hardcoded 24-country rates, fake map pins/reviews, mock speech or immediate camera wallet additions. Reuse *only* the motion/visual inspiration with our existing production services.
- **Country picker is already implemented with a draft→confirm flow on latest A02 source**. Do not rebuild as an old auto-closing list. Existing 16:9 owner hero `/assets/setting_tab/travel_setting.png` and real runtime country name/flag must stay; preserve data-reset confirmation, PWA install truth and saved places.
- Preserve previous white UI requests: country flags in language+FX selector, `#FFFFFF` surfaces, no visible source-provider label where lawful, verified historical rate/source date stored in data. Keep old i18n dictionary keys unless implementation actually needs additional strings.
- Modal/disclosure/keyboard/accessibility: 44–48px targets, 320/375/430px, 200% font, `prefers-reduced-motion`, focus, safe-area, offline/permission partial failures. No fake success toast or invented dates.
- A02 shall report **actual code full SHA/CI and screenshot/video evidence** for all 5 tabs + Welcome after implementation; A03 status remains DESIGN_ONLY until then.

## 5. Ownership and governance

- **A03:** mint visual plan, UX copy/states, canonical assets/README, gap report and direct A02 handoff.
- **A02:** React/Tailwind changes in [PR #11](https://github.com/Junebooky/travel-os/pull/11), smoke/regression/unit checks, true screenshot comparison, CI full SHA. Keep Track A PR #4 unmerged.
- **A01:** owner status/release decision; **A04 independent QA remains PAUSED_BY_OWNER**.
