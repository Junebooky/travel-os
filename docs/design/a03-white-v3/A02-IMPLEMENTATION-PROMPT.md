# A02 DIRECT IMPLEMENTATION PROMPT — Owner latest (2026-10-18 21:32 KST)

> **A03 → A02(실코드 반영), A01(오너 현황)**  
> **CURRENT INSTRUCTION, replaces the prior outdated dark-UI gap prompt at this exact path.**  
> **Design:** https://github.com/Junebooky/travel-os/pull/18 (Draft; SVG/README only).  
> **App:** https://github.com/Junebooky/travel-os/pull/11 (A02 Track B actual React/Tailwind implementation).  
> **Last verified actual app source:** PR #11 SHA `5cf2c95961c6e38893a17e45217b88a7eab7bf30`, 2026-10-18. A02 must recheck HEAD before editing.  
> The older localhost dark-theme screenshots and SHA `277e9b9` describe a past version; **the app code is now partially white already. Do not restart a full redesign.**

## 1. Latest owner's EXACT four requests

1. **Translation top selector:** follow owner's uploaded Korea↔Thailand reference. In `src/components/TranslateView.tsx`, current selector container uses `bg-[#FFFFFF] border border-[#E5E8EB] rounded-2xl p-3.5 flex items-center justify-between shadow-sm`. Preserve this container styling and add **a circular flag next to each corresponding language**, labels `원문 언어 / 한국어` and `번역 언어 / 태국어 (TH)` as appropriate for the real selected values. Swapping must swap **flags, language text, codes, actual translation direction and TTS**; no hardcoded 'Thailand' for Japan/USA/Vietnam. The flag reference is [02-translate.svg](./images/02-translate.svg).
2. **No gray `rgb(242,244,246)` anywhere in app UI:** The user says the previous pale gray is unpleasant **in all UIs**, not just the translation tab. **Use `#FFFFFF` for all page backgrounds, input surfaces, cards, neutral chips, warnings and button backgrounds** (aside from the one solid brand blue primary CTA). Use the existing `#E5E8EB` neutral border sparingly for white-on-white separation. Preserve dark gray text `#191F28`/`#4E5968` and focus/error accessibility states; do not make fields invisible. Change **`src/app/globals.css` root background**, all hardcoded Tailwind `bg-[#F2F4F6]` and equivalents across real components. Do not change only CSS variables while JSX literals remain. The brand blue `#1B64DA` stays **single exact color**; no blue tints, orange, or unrelated accent UI colors. **Actual geospatial map tiles, national flags, actual photos** are content and do not have to become monochrome.
3. **Currency top selector flags:** In `src/components/CurrencyView.tsx`, same top selector container as translation already exists. Add circular national/regional flags **next to both `fromCurrency` and `toCurrency`**, e.g. Thailand `THB (฿)` ↔ Korea `KRW (₩)`. Reverse icons and labels when swapping. Reference: [03-rate.svg](./images/03-rate.svg). Do not hardcode `₩` for swapped non-KRW currency: use actual selected `currencySymbol` mapping.
4. **Remove visible provider attribution `제공 : open.er-api` and `제공: open.er-api` from ALL app UI screens.** In `CurrencyView.tsx`, eliminate the rendered `t('currency.result.source', { providerName: rateData?.provider || 'open.er-api' })` element (~line 389 of source SHA 5cf2); keep valid **환율 기준 날짜, 실제 환율, stale/cache warning, 인라인 재시도**. Inspect all app component displays of `currency.result.source`, `price.rate.provider`, `price.currency_rate_info`, `wallet.rate.snapshot_provider`, `providerName`, `제공:`, and raw `open.er-api`; none should output that provider label in UI. **Keep internal provider/source metadata for rate validation, user-record snapshots, tests and debugging.** Do not fake source/date or misrepresent live rates. If the chosen API/data license imposes visible attribution, report this **as a release blocker for owner decision** rather than removing legally required notices.

## 2. Exact visual references, source of truth

**[Current 8-screen overview](./white-ui-v3-overview.svg)** · **[full README](./README.md)**. The following links reference the same paths as before, but their SVG contents have been **replaced in place**, so do not load an old PR snapshot or comment attachment:
- [02 translation: flags & all-white](./images/02-translate.svg)
- [03 currency: flags & no provider text](./images/03-rate.svg)
- [01 map](./images/01-map.svg), [04 camera capture](./images/04-camera-capture.svg), [05 camera result](./images/05-camera-result.svg), [06 wallet](./images/06-wallet.svg), [07 expense](./images/07-expense.svg), [08 settings](./images/08-settings.svg)

**Shared reusable flag component recommended** (`CountryFlagIcon`):
- Accept a **real language or currency code**, derive flag via a centrally defined mapping; display **24–32px circular flag** adjacent to the text, consistent across both selector bars, `aria-hidden="true"` on the decorative flag (screen reader reads actual labels). Preserve source and target text selectors, 44px min swap/change hit targets.
- Initial maps e.g. languages `ko→KR`, `th→TH`, `ja→JP`, `vi→VN`, `fr→FR`, `en→US/GB` depending on actual selected country. Currencies `KRW→KR, THB→TH, JPY→JP, VND→VN, USD→US, GBP→GB, EUR→EU`; map additional supported options where possible. If no grounded country, show neutral globe and currency/language code, **not a wrong flag**.
- Country-flag intrinsic red/blue etc. are **semantic content colors**, not a second brand theme; do not recolor flags with brand blue.
- Prefer local inline SVG/controlled licensed assets, not network-dependent flag CDN. Use `aria-label` on controls and test 320px overflow, long names, swapping and keyboard focus.

## 3. App files & targeted technical diff

| Priority | Current code on PR #11 (as last checked) | What A02 changes |
|---|---|---|
| P0 UX top bar | `TranslateView.tsx` ~323–349: labels only | Flag + accurate label for both sides; keep selector bar class; sync on swap/localStorage/country change |
| P0 UX top bar | `CurrencyView.tsx` ~248–274: text-only `fromCurrency/toCurrency`; target currently hardcodes `₩` | Flag + currency symbol derived from actual selected currency; swap must reverse both |
| P0 UI color | `globals.css` has root background old gray; `TranslateView` ~300 / `CurrencyView` ~225 and nested neutral surfaces | White background everywhere in app chrome; audit `bg-[#F2F4F6]` across all components, not just two selectors |
| P0 copy | `CurrencyView.tsx` ~389 source-provider text | Remove provider's **visible** label only. Keep rate provider/date fields internally; user still gets accurate date/stale condition |
| P1 QA | Theme/flags/rates/translation | Actual screenshot comparison at 320/375/430px and accessibility/focus; GitHub Actions on new full SHA |

Keep existing features: 5-tab navigation, map/place context, translation STT/TTS, honest no-cache exchange rates, real expense confirmation/rollback, Phase2 strings, permission/privacy disclosure. Avoid updating Track A or merging to main.

## 4. Acceptance test grid — A02 must record real evidence

- [ ] Korean↔Thai translation selector renders **two circular flags beside labels**, including country swap, and has **no incorrect language text**, also Japanese / French / Vietnam / English where supported.
- [ ] THB↔KRW currency selector renders flags + correct currency signs/directions after reversing; test JPY↔KRW and unknown currency fallback.
- [ ] At every tab, overlay, warning, modal, neutral chip, and input, no old gray background remains. All ordinary UI surfaces white; `#1B64DA` remains only UI accent, `#E5E8EB` border allows fields/cards to be perceived on white.
- [ ] No visible `제공: open.er-api` / `제공 : open.er-api` or translated provider text anywhere (including wallet/camera/price); rate basis date remains visible and valid.
- [ ] No new fake rates; never treat no-cache as converted 0 or fabricated number. Cache TTL/source validation is unchanged.
- [ ] 320/375/430px, large type, swap min 44px, touch/keyboard and screen-reader; no overlap or truncation.
- [ ] PR #11 full new SHA + lint/typecheck/tests/build CI link + actual mobile screenshots before marking DONE. Image-only PR #18 is NOT running app verification.
- [ ] Owner approval required for main/production deployment; A04 QA remains `PAUSED_BY_OWNER`.

## 5. Handoff format

```
보고: [발신:A02 → 수신:A03(디자인 실화면 대조), A01(오너 현황)] [4 owner requests: DONE / PENDING] [new full SHA] [CI status]
위치: [PR #11 commit/Actions link] · [runtime 320/375/430 screen captures] · [remaining differences]
```

**No automatic communication between the agent chat sessions:** this issue/PR handoff needs A02 to review its issue queue. Do not claim implementation complete merely because this instruction is posted.
