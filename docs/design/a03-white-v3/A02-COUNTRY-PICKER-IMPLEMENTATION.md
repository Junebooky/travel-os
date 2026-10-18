# [A03 → A02] OWNER REFERENCE · Full-screen Country Picker implementation contract

**2026-10-18 · CURRENT** · **scope limited to Settings tab → 여행 설정 바꾸기 country picker**  
**Design ref (GitHub file, visual single source of truth):** [09-country-picker.svg](./images/09-country-picker.svg) · [9-state storyboard](./white-ui-v3-overview.svg)  
**Source to change:** [src/components/SettingsView.tsx](https://github.com/Junebooky/travel-os/blob/feat/track-b-phase2-extensions/src/components/SettingsView.tsx) around lines **253–291** on PR #11 HEAD last observed `5cf2c95961c6e38893a17e45217b88a7eab7bf30`. Preserve the rest of the settings section, particularly data deletion confirmation and saved places.  
**Data:** `src/data/countries.ts` exports `COUNTRIES` with **8 countries** (JP, US, FR, TW, TH, VN, GB, IT) in the exact visual reference order. **No country fake entries, no removal.**

## A. Before → After

| BEFORE — current React country chooser | AFTER — owner supplied reference |
|---|---|
| Centered `max-w-sm` modal, dim scrim, 80vh height | **Full-height, mobile-first white selection page**, visually similar to native full-screen sheet; rounded top corners only where meaningful |
| Vertically stacked eight full-width text rows | **3-column x 3-row grid** of 8 tactile country cards (last slot intentionally empty, no fake choice) |
| Flat country flag emoji at 20px | **Large glossy, spherical circular flag assets** centered in each card (local SVG with correct national flag design, 64–76px; not CSS-filtered Unicode flag emojis or remote CDN) |
| Country only as text with selected row accent | **White cards**, neutral `#E5E8EB` thin outline, 16–20px radius, centered bold black country name; selected tile has **2px solid brand `#1B64DA` outline + solid blue circle with white checkmark** at top right. Selection not signaled by color alone |
| Small utilitarian title and long scroll panel | Header: small `TRAVEL OS` label, strong **"여행할 나라를 선택하세요"** title, soft secondary **"어디로 떠나시나요?"**; optional **neutral** tiny plane/globe motif (do not reintroduce light blue background, orange/green decorative brand colors) |
| Small gray close button at end | Fixed bottom safe-area footer with **full-width white bordered `닫기` button** (min height 52px, 16px+ readable text) |
| Current selection is active based on `country.code` | Highlight **actual selected country from React context**; screenshot Japan is a visual example, not a hardcoded default |

### Image layout proportions
- Reference canvas **390×844** design SVG; implement responsive CSS rather than fixed pixel UI.
- Top hero region ~180px, cards begin ~235px; on **375px width**, `grid grid-cols-3 gap-2.5` and `px-4` give ~106px cards. **320px width**: 3 columns still fit with 10px gap and 12px margins; 13px labels remain legible, `이탈리아` must not clip.
- Card minimum height **124–132px** (responsive to available height); centered sphere **64–76px** and name 14–16px. Control min touch target 44px.
- Selection check target top-right not occluding flag; selected border must be visible even at normal/large text.
- Modal root **`bg-[#FFFFFF]`**, cards **`bg-[#FFFFFF]`**, light border **`border-[#E5E8EB]`**, text **`#191F28`/`#4E5968`**, one brand blue **`#1B64DA`** only; no old `bg-[#F2F4F6]` or blue-tinted selected backgrounds. **Country flags alone carry their true national colors.**
- Optional pale decorative world-globe image in reference is not required; if present, prefer near-invisible neutral strokes rather than a new pastel blue brand surface. No overanimation.

## B. Exact behavior contract — preserve working app state
```txt
Settings tab
  └ "여행 설정 바꾸기" click
     └ CountryPickerModal opens fullscreen
        ├ 8 options in COUNTRIES order
        ├ currently selected card has border/check (e.g. JP)
        ├ select country:
        │  ├ setCountry(c) via existing TravelContext action (NOT separate mock state)
        │  ├ update locale/currency/map using existing context semantics
        │  ├ close picker (current behavior; keep for low friction)
        │  └ retain existing success toast if actual update succeeds
        └ "닫기" / Escape / explicit close → dismiss, no changes
```

The reference picture shows a selected country while picker is open, which is handled by drawing the checked tile for the **current** country when opened. There is **no need to change 'tap country immediately selects and closes'** without owner approval. Do not add a new Apply step or fake persistence. If A02 wishes to make selection stageable in future, request separate UX review.

### Implementation shape (guide, not fake deployment)
```tsx
// SettingsView.tsx — modal refactor, not a new country dataset
<CountryPickerModal
  isOpen={isCountryPickerOpen}
  countries={COUNTRIES}
  selectedCode={country.code}
  onSelect={(nextCountry) => {
    setCountry(nextCountry);
    setIsCountryPickerOpen(false);
    showToast(`${nextCountry.name}(으)로 여행 설정을 변경했어요`, "success");
  }}
  onClose={() => setIsCountryPickerOpen(false)}
/>
```

Suggested **`src/components/CountryPickerModal.tsx`**:
- Accessible `role="dialog"`, `aria-modal="true"`, `aria-labelledby="country-picker-title"`, focus trap, focus return to trigger, `Escape` dismissal; do not leave the background scrollable under the sheet.
- Root `fixed inset-0 z-50 bg-white flex flex-col` on mobile; desktop `max-w-md` visually centered if desktop supported. Respect `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` and `100dvh` changes.
- Top non-scrolling title/header; middle **`overflow-y-auto min-h-0`** country grid; bottom **`shrink-0`** close CTA, visible on 568px-height phones and 200% text size.
- `COUNTRIES.map` button cards with `type="button"`, `aria-pressed={selectedCode === c.code}`, accessible label (`일본, 선택됨`), `focus-visible:ring-2 focus-visible:ring-[#1B64DA]`, selected border. Never render a fake ninth country to fill the grid.
- Reusable `CountryFlagSphere` (or local flag SVG assets) with `countryCode` for all eight countries; flag `aria-hidden="true"`, **real country name as accessible text**. Provide a text/flat vector flag fallback for unsupported assets. Prefer static local `svg`/CSS radial gradient overlay to heavy WebGL, network images, animated canvases, or paid icon packages.
- Decorative Travel OS airplane/globe needs `aria-hidden`, no tap action.
- Buttons require real hit area ≥44px. The `닫기` footer is **secondary, outlined on white** (not disabled). Disabled-looking contrast in the reference must **not** make the button illegible.

## C. Acceptance tests A02 must post to Issue #15
- [ ] Open picker from Settings on real mobile 320/375/430px. Three columns and eight correct country names, spherical flag assets rendered with no clipped labels and no surprise scroll traps.
- [ ] Initial selection **matches currently saved country**, not hardcoded JP; blue outline/check only on actual selection. Close/Escape keeps existing choice. Tapping TH updates context, toast/Settings labels/translation target/currency/map as before; reopen shows TH checked.
- [ ] Screenreader reads country names and selected status, not flags as isolated emoji; keyboard Tab/Enter/Space and Escape, focus restoration and body scroll lock work.
- [ ] Small-height and 200% font-size view: grid scrollable, header/close button accessible; safe-area under PWA/mobile browser.
- [ ] No `#F2F4F6` in country chooser. White cards, neutral borders, **one UI blue**; intrinsic country flags retain national color.
- [ ] Old center vertical list is no longer rendered. No direct changes to `COUNTRIES`, `TravelContext`, destructive data reset or existing success behavior without reason.
- [ ] Post actual PR #11 full SHA, GitHub Actions lint/typecheck/tests/build, screenshots comparing to [09 SVG](./images/09-country-picker.svg). Mark **CODE_APPLIED** only after actual running app is checked.

**Owner/release rules:** no main merge or public deployment without owner; A04 QA `PAUSED_BY_OWNER`. This A03 document and SVG are **DESIGN_READY**, not running app implementation.

## D. Old source references (superseded appearance only)
- The 8-screen [original Settings view](./images/08-settings.svg) remains current as a **parent screen**. The new modal `09-country-picker.svg` is a separate **state**, not a duplicate/old version. The earlier center list appearance is superseded.
- [Top-level current README](./README.md) · [All 9 screens/storyboard](./white-ui-v3-overview.svg) · [A02 existing general prompt](./A02-IMPLEMENTATION-PROMPT.md).
