# A02 IMPLEMENTATION PROMPT — owner screenshot gap / exact one-blue UI

> **CURRENT SINGLE SOURCE** · A03 → A02 · 2026-10-18 · **CODE IMPLEMENTATION REQUEST**  
> **Status:** DESIGN_GAP_CONFIRMED_FROM_OWNER_SCREENSHOTS + PR #11 SOURCE; VISUAL_CODE_NOT_APPLIED  
> **Approved design asset branch:** `design/a03-white-ui-v3-visual-handoff-20261018` @ `259336bae1dd11e4864a3cb899845944872155fa`  
> **Implementation branch (A02):** `feat/track-b-phase2-extensions` · PR #11 @ last checked `277e9b97b0a8848db99318b76c8c4a4e17ec47a3`  
> **This is a developer implementation prompt, not a claim code is already updated.**

## FIRST: Look at the files, not the old written comments

**Priority order for A02 (do not implement the former dark/tinted variant):**

1. **Current one-blue overview** (all 8 screens):  
   https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/white-ui-v3-overview.svg
2. **Screen-by-screen README and token/behavior rules:**  
   https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/README.md
3. **The 8 full-res reference SVGs** (links below), one for each UI surface/step.
4. **This exact owner screenshot gap / implementation prompt**, which is the **current implementation checklist**.

**Important:** GitHub PR #18 is **DRAFT design-only** and based on the previous Track B tip. It does **not automatically apply style changes to running localhost**. A02 must apply changes to the **working application code in PR #11** and run that new code. Do not merge main or deploy without owner approval.

## Screenshot reality vs current approved design

The owner supplied **six real screenshots from localhost:3000** in the A03 chat. These are *user-provided local runtime evidence*, not generated screenshots nor automatically uploaded into this GitHub repository. Code comparison was made at PR #11 HEAD `277e9b9...`. The browser tab context also confirms settings and five navigation labels.

| Owner screenshot (source) | What is actually visible | What MUST change | Canonical SVG | App code |
|---|---|---|---|---|
| 01 Map (1.10.19) | Dark OSM tile colors; navy search/black pills; bright blue selected chip; orange/yellow demo warning; navy GNB | Page/card chrome neutral; remove tile `invert/hue-rotate` filter; light search/white sheet; selected chip **near-black**, not pale blue; selected map pin ONE `#1B64DA`. Demo message remains, but neutral icon/text/callout | [01-map.svg](./images/01-map.svg) | `src/components/MapView.tsx` (~407,442,527,594,637,766), `Navigation.tsx` |
| 02 Translate (1.10.25) | Navy background; tinted purple/green launcher tiles, many thin borders, orange phonetic text, gradient purple CTA. Also **source Korean / target Korean** but result Japanese in screenshot | Two independent concepts: (a) white neutral translation UI, one blue translate CTA; contextual back separate. (b) **LANGUAGE CONSISTENCY / P0 data accuracy:** ensure source and target are not unintentionally both `ko` while displaying a Japanese result; clear stale result on language change; default target from destination correctly and validate persisted lang | [02-translate.svg](./images/02-translate.svg) | `src/components/TranslateView.tsx` (~70–75,177–224,273+), `src/context/TravelContext.tsx` (~214–245), `SettingsView.tsx` |
| 03 Currency (1.10.32) | Dark background, orange 'THB', blue rates, heavily bordered dark conversion cards/table | Big converted amount in **white** card, one `#1B64DA` used for actual action, text-based stale/no-cache state and inline retry. **Keep real provider/date and the original currency!** Do not fabricate exchange rates just to make mockup numeric. Simplify/secondary-ize comparison table, do not silently remove useful feature | [03-rate.svg](./images/03-rate.svg) | `src/components/CurrencyView.tsx` (~225–274,317–425) |
| 04 Wallet (1.10.37) | Navy cards, purple header action, dark empty state; major vertical blank field | Neutral-white total summary, `+ 기록` compact secondary action upper-right, clearly differentiated empty state. Partial converted total remains disclosed in short text; no falsely real example transactions | [06-wallet.svg](./images/06-wallet.svg) | `src/components/WalletView.tsx` (~129–255) |
| 05 Expense modal (1.10.44) | Black mask + small bordered navy central modal, indigo save, `card` preselected and full form labels tiny. CTA below many fields and non-sticky | Replace with an **accessible white bottom sheet/full-height step**, large amount, neutral card/cash chips (not assume card unless user saved preference), optional details disclosure, **sticky `{{amount}}{{currencyName}} 지출 기록하기`** above mobile keyboard and safe-area, focus trap/escape/return. Preserve user-entered draft on failed save and no fake success | [07-expense.svg](./images/07-expense.svg) | `src/components/WalletView.tsx` (~39–49,326–470), `TravelContext.tsx` |
| 06 Settings (1.10.51) | Slate-950, dark cards, blue/amber/red/green badges, text 10–12px, delete red bar, technical notes | Neutral white grouped cards and dark typography, one brand blue for primary '앱 설치' (if functional). Destructive delete **explicit confirmation**, not alarmistic orange/red decoration; privacy note legible. Keep functional options and country/flag/data deletion | [08-settings.svg](./images/08-settings.svg) | `src/components/SettingsView.tsx` (~89–320) |

**Not shown in six screenshots:** camera stages; still part of required 8-screen visual target and tracked by the next two references. [04-camera-capture.svg](./images/04-camera-capture.svg) → [05-camera-result.svg](./images/05-camera-result.svg), code `CameraMenuModal.tsx`. Keep photo server/third-party AI pre-transfer disclosure and explicit actual expense review. Existing P0 implementation of these safety flows must be **reused**, not rewritten.

## Copy/paste — A02, carry out this exact engineering request

```text
ROLE: Travel OS A02 senior full-stack implementer. The owner has personally reviewed six localhost screenshots and rejects the current dark/tinted UI. Do not explain the design only; modify actual Track B application code in PR #11.

FIRST OPEN, IN THIS ORDER:
1. https://github.com/Junebooky/travel-os/pull/18 (DRAFT design refs ONLY)
2. https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/white-ui-v3-overview.svg
3. https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/README.md
4. https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/A02-IMPLEMENTATION-PROMPT.md
5. Each SVG ./images/01-map.svg ... 08-settings.svg in the same directory.

OWNER-DESIGN CONTRACT (must match actual localhost result):
- All app chrome: canvas #F2F4F6; cards, top header and bottom GNB #FFFFFF; main text #191F28; secondary #4E5968.
- ONE EXACT brand blue: #1B64DA. Use only as primary CTA / selected navigation / selected map pin / necessary interactive focus. No extra branded shades, no blue tinted surfaces (#E8F3FF, blue/10, blue/20), no purple/indigo, orange/amber/yellow, green, rose/red as arbitrary UI decorations. Neutral black/gray/white for secondary actions, empty states, warnings. Maintain visible focus and error indicators with shape, copy, icons; do not hide safety disclosures.
- This palette applies to app chrome, NOT factual content imagery, flags or actual OpenStreetMap map tile information. Show natural legible map tiles without forced dark/invert/hue-rotate/grayscale distortions.
- Cards: mostly borderless white fill on gray background, ample 16–24px spacing, clear large type, minimal shadows; no gradients/multi-color icon blocks.
- Bottom navigation remains EXACTLY five tabs map / translate / currency / wallet / settings. Consistent filled vector icons, current tab visually identifiable and labeled.
- Contextual screens: a separate accessible ← back button; below title a nonclickable place subtitle. Don't mix back and place in same chip.
- Do not redesign backend or break already implemented features. Reuse 326 P0 + 226 P2 i18n keys and existing P0 trust safeguards.

IMPLEMENT IN ACTUAL APP (not just design markdown or Figma):
A. Shared token CSS in src/app/globals.css + TravelApp.tsx and reusable component primitives. REPLACE hard-coded Tailwind classes per surface; changing CSS variables alone WILL NOT change bg-slate-* and bg-indigo-* in each component.
B. Navigation.tsx white GNB, neutral inactive icons, ONE exact blue active icon; no pale blue icon badges.
C. MapView.tsx: remove brightness/invert/hue-rotate tile filter; white map search/category overlay and place sheet, selected black neutral filter and blue actual place pin; preserve demo/no-key banner information with neutral styling, preserve all place/translation/currency/wallet context state.
D. TranslateView.tsx: remove purple/green feature boxes, border overload and gradient CTAs; use natural large output text; P0 verify that source=ko,target=ko never produces/display prefilled Japanese! Inspect TranslateView initial QUICK_PHRASES fallback and session/persisted targetLang; clear stale result when swapping/destination change. Do not invent successful translations.
E. CurrencyView.tsx: white rate card, bigger KRW result and actual provider/date close to money; inline refresh and neutral stale warning; confirmed 7-day cached rate only, no guessed/default currency conversion. Preserve comparison functionality with secondary hierarchy.
F. WalletView.tsx: white totals/empty/list, upper-right neutral '+ 기록'; change cramped center modal into white mobile bottom sheet or full-screen step with large amount and proper keyboard/safe area support; sticky amount-labelled save. Remove assumed card preselection from manual form (and OCR if still hardcoded) unless a real saved user preference exists; preserve existing record schema and save-failure safeguards. No duplicated confirmation checkboxes.
G. CameraMenuModal.tsx and VoiceChatModal.tsx: neutrals/one-blue only, separate capture-before / OCR-after results; keep accurate third-party photo transfer disclosure, no demo as real receipt, real expense review before wallet saving.
H. SettingsView.tsx / SavedPlacesModal.tsx / onboarding / confirmation dialogs / toasts / all modal overlays: don't leave dark backgrounds/multicolor status chips mixed into the final product. Preserve all existing text, permission/clear-data guardrails, and 44–48px targets.

WRITE REAL VERIFICATION EVIDENCE:
- Latest full commit SHA in PR #11 plus GitHub Actions run for lint, typecheck, test, production build. CI 'green' before these changes does NOT prove the light UI.
- Actual app screenshots at viewport widths 320, 375, 430 for map, translate, currency, wallet, expense sheet, settings, camera pre/post (where testable); compare each with PR #18 CURRENT SVG, not with outdated issue copy or v2 screenshot.
- Check 200% text zoom, keyboard overlays, scroll/safe-area, map zoom/selected place on return, keyboard Tab/Enter/Space, screen reader labels/focus return, no empty fake KRW and no wrong language-direction, localStorage forced failure, OCR candidate not silently saved as actual expense, 7-day cached rates plus valid source/date.
- Only mark a screen DONE when actual rendered UI passes the comparison. For any screen not implemented, mark PENDING with reason.
- Keep PR #4/Track A and PR #11 separate, do not merge to main or publicly deploy without owner's approval, no new paid UI library/APIs or destructive migration, A04 QA remains PAUSED_BY_OWNER.

RESPOND IN ISSUE #15:
[FROM A02 -> TO A03 (visual sign-off comparison), A01 (owner status)]
[screen IDs completed/pending] [real branch + full SHA] [GitHub Actions link] [screenshots/capture evidence] [deviations and why].
```

## Must-fix targeted bug checks (not proven root causes)

### P0-LANGUAGE-CONSISTENCY
Screenshot 02 + settings 06 show **both** `한국어` source and target, yet Japanese translation. The screenshot alone does not determine all state transitions, but source inspection supports a plausible route:
- `TranslateView.tsx` ~70–75 initializes output to `targetTranslations[targetLang] || targetTranslations['ja']` even if `targetLang==='ko'`.
- `TranslateView.tsx` ~185–189 quick phrase selection falls back `targetTranslations['en']` instead of treating same-language direction.
- `TravelContext.tsx` ~215–217 loads `targetLang` from persisted `getInitialLang`, with `sourceLang='ko'`.
- `SettingsView.tsx` ~133 displays persisted targetLang as country language.
**Acceptance:** destination Thai on fresh config → source Korean/target Thai by default; persisted mismatched/same-language value → correct intentional UX (offer selection/no translation), never Japanese shown under Korean target; actual language change invalidates stale result + TTS, old saved localizations do not override correct travel destination silently.

### P1-MANUAL-PAYMENT-METHOD
A02 already implemented the *OCR review confirmation* in PR #11, but `WalletView.tsx` ~48 still initializes `paymentMethodInput` to `'card'`, and `CameraMenuModal.tsx` ~200 still assigns `paymentMethod:'card'`. That is a distinct remaining accuracy/friction task. **Do not regress storage integrity.** If the expense type currently requires card/cash, make backwards-compatible handling for unknown/optional payment method instead of declaring fake card transaction.

### P0-LIGHT-THEME
`globals.css` still has `--background:#020617`; `TravelApp.tsx` uses `bg-slate-950`; `Navigation.tsx` uses `bg-slate-950/95`; `MapView.tsx` tile filter remains `brightness... invert hue-rotate`. These are verified code facts, not an aesthetic opinion. The owner screenshot confirms that the running local UI looks consistent with this dark code; however, the localhost checkout's exact Git SHA was not verified, so do not claim which branch is running from screenshot alone.

## Suggested implementation batches (A02 chooses safely)
- **Batch 1, mandatory owner visible:** common tokens/app shell + Navigation + Map + Translate + Currency + Wallet + Settings (six screenshot states), strip all multicolor chrome. Includes language mismatch test.
- **Batch 2, mandatory journeys:** expense mobile sheet/keyboard + Camera capture/result + voice/onboarding/other modals/toasts; remove old dark surface leftovers.
- **Batch 3, verification:** actual screenshots + compare with current 8 refs + regression suite and final CI. Only after visual comparison should screen-specific DONE be accepted.

**Acceptance = visual parity and behavior parity, not literally pixel identical**; preserve real content, dynamic country/currency values, device system UI and useful existing features. If SVG shows example Tokyo/JPY and localhost country is Thailand/THB, retain real Thailand/THB. Do not hardcode demo values from SVG.

## Links & governance
- **Current eight-screen SVG design PR:** https://github.com/Junebooky/travel-os/pull/18
- **Current README:** https://github.com/Junebooky/travel-os/blob/design/a03-white-ui-v3-visual-handoff-20261018/docs/design/a03-white-v3/README.md
- **A02 actual PR:** https://github.com/Junebooky/travel-os/pull/11
- **A02 work issue:** https://github.com/Junebooky/travel-os/issues/15
- **A03 spec issue:** https://github.com/Junebooky/travel-os/issues/14
- **Shared dashboard:** https://github.com/Junebooky/travel-os/issues/13

**Version control:** on next visual change, overwrite SVG at the same path + overview + README + this implementation prompt; obsolete files are removed from current branch HEAD, Git historical commits retained. Do not let old comments/commits override the current HEAD source.
