# TASK-520-05: Tests, Docs & Closure — Scrolled State, Radius, Custom Shadow, Brand Icon/Combo

# FileName: TASK-520-05-Tests-Docs-Closure.md

**Parent Task:** TASK-520
**Priority:** High
**Category:** Testing / Documentation / Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-520-01, 520-02, 520-03, 520-04 (all landed).
**Status:** ⏳ To Do

---

## Scope (single-writer)

**520-05 is the SOLE WRITER of the cross-cutting test files + the doc files listed
below + the closure changelog entry.** It authors the full regression matrix
(consolidating the per-subtask test shapes), the ≥6-scenario Playwright smoke
(owner mandate), the documentation updates, and the closure. Each earlier subtask
authors its OWN unit tests in its own lane (per its file); 520-05 owns the
integration/route test additions, the smoke, and any cross-file test that spans
subtasks. No production-source edits.

## Test matrix (lanes per `_docs/TESTING_STRATEGY.md`)

**Vitest (Bun-free, pure model) — `tests/vitest/services/menu-document-v2.test.ts`:**
- Round-trip per new key (bar: `radius`, `shadowCustom`, `surfaceColorScrolled`,
  `borderColorScrolled`, `borderWidthScrolled`, `shadowScrolled`,
  `shadowCustomScrolled`; brand: `mode:"icon"`, `icon`, `showText`, `iconColor`,
  `iconSize`).
- Reject-unknown KEY throws (`MenuDocumentError` + path) for bar layout + brand.
- Fail-soft VALUE omit (bad enum/color/shadow/icon).
- `normalizeMenuBoxShadowValue` unit table (accept owner token + hex8 + inset +
  2-layer; reject injection/`url(`/`var(`/5-layer/>200/missing-color).
- `normalizeBrandIconName` unit table.
- Present-only / byte-identity for legacy docs; `schemaVersion===1`.
- Per-device `responsive.mobile.layout.radius` merge.

**Bun CSS/render — `tests/unit/site/menu-document-render.test.tsx`** (`bun:test` +
`renderToString` ⇒ Bun lane per `_docs/TESTING_STRATEGY.md`, `tests/unit/*` = Bun):
- Radius / custom-shadow-overrides-enum / scrolled `[data-scrolled]` block /
  no-override byte-identity / per-device (520-02).
- `BrandRender`: icon mode svg, unknown-icon fallback, combo, back-compat,
  per-device (520-04-L01).
- Scroll-machine script emitted only front+sticky+scrolled-variant; NOT in preview
  / non-sticky / no-variant (520-04-L02); script is the exact static literal.

**Vitest admin/UI — `tests/vitest/ui/menu-design-editor.test.tsx`:**
- Bar controls: radius, custom shadow (fail-soft empty on drop), scrolled group
  gated on sticky, preview scrolled toggle stamps `data-scrolled` (520-03-L01).
- Brand controls: mode selector, icon picker (icon mode only), icon color/size,
  combo toggle, canvas preview parity (520-03-L02).
- `ControlDefaultHint` is ABSENT for the new bar keys (`radius`, scrolled colors,
  `borderWidthScrolled`, `shadowScrolled`, `shadowCustom*`) — they are held out of
  `MENU_BAR_LAYOUT_KEYS`/`SHELL_APPEARANCE_DEFAULTS`, so `resolveMenuControlDefault`
  returns `value===undefined` and the 507 guard hides the hint; the controls render
  without crashing and use static helper text instead (520-03-L01).

**Bun route lane — `tests/integration/routes/menus.test.ts`:**
- A `document` PATCH carrying the new bar + brand keys persists per-key without
  dropping siblings; an invalid payload 4xx's with `menu_document_invalid` + `path`.
- Security negatives persisted-away: `shadowCustom` with `;}`/`url(`,
  `surfaceColorScrolled:"url(x)"`, `icon:"../../etc"` are dropped on write; the
  round-tripped stored doc excludes them.

**Byte-identity guards (must stay green, ZERO edits):**
`tests/unit/pages/siteShellCss.test.ts` (`buildSiteShellCss(null)` byte-identical);
existing menu-document no-override render golden.

## Playwright smoke (owner mandate — ≥6 distinct real-flow scenarios, light + dark, 0 console errors)

Run against live admin (`coderso-dev-core-host`,
`http://coderso-a.localhost:5173/admin/`) + real front (:3000) with
`playwright-cli`; screenshots to `_docs/_workflows/_smoke/wf520-*.png`. Assert
VISIBLE effects (computed styles / DOM state), NOT checklist ticks:

1. **Floating-header scroll transition (owner tokens).** Author base
   `surfaceColor:#0812209e` / `borderColor:#ffffff1f` + scrolled
   `surfaceColorScrolled:rgba(8,17,31,.84)` /
   `borderColorScrolled:rgba(255,255,255,.18)` /
   `shadowCustomScrolled:0 18px 50px rgba(0,0,0,.24)` on a sticky bar; publish; on
   the front assert computed `background-color`/`border-color`/`box-shadow` change
   when `data-scrolled` toggles at scrollTop >8 and revert at top.
2. **Card radius** `18px` computed on the header (front + canvas), per-device
   (mobile override honored).
3. **Custom shadow beats enum** (`shadow:"sm"` + `shadowCustom` → computed custom
   value; clear → reverts to preset).
4. **Brand icon mode** (`house` + alpha `iconColor` + `iconSize:28` → lucide `<svg>`;
   invalid name → site-name fallback).
5. **Graphic-with-text combo** (`image`/`icon` + `showText` → graphic + wordmark
   side by side; unset → graphic-only, byte-identical).
6. **Cross-device + publish→front parity** at desktop/tablet/mobile.
7. **Security negatives** (injection shadow / `url()` color / path-traversal icon
   all dropped; header renders unaffected).

## Documentation updates (owned here)

- `_docs/PAGE_MODEL.md` — `MenuBarLayout` new keys (`radius`, `shadowCustom`,
  `*Scrolled`); `BrandProps` `mode:"icon"` + `icon`/`showText`; `BrandStyle`
  `iconColor`/`iconSize`.
- `_docs/CONTENT_TYPES_SPEC.md` — scrolled/floating-state colors, menu-bar card
  radius, custom shadow, brand icon + graphic-with-text combo (enums, present-only,
  per-device, security whitelist notes).
- `_docs/_CHANGELOG/` — new entry, **next-free number = 1233** (highest present on
  disk 2026-07-07 = 1227; highest pinned in `_TASKS` = 1228 (TASK-516); TASK-519
  will take an intermediate — **RE-VERIFY next-free at closure**; do NOT edit
  `_CHANGELOG/*` or `_TASKS/README.md` during dev — orchestrator owns them; only
  PIN the number here).
- `_docs/_TASKS/README.md` — board + child rows / Statistics (owner-managed; do NOT
  edit here).

## Gates (all must be green at closure)

Root `tsc -p tsconfig.json --noEmit` AND `bun --cwd core lint:types` (the two-scope
typecheck — after prop-signature changes a test excess-prop error can hide from the
core-only lane); vitest (named files if the full glob flakes); `bun test`;
`gates:coderso` (5/5). The known settings/smoke DB-pollution transient is
self-isolating; re-run named files if a spurious timeout appears.

## Definition of done

Full matrix + ≥6-scenario smoke green (light + dark, 0 console errors); all Hard
Invariants verified (no DDL/migration, no schemaVersion bump,
`buildSiteShellCss(null)` byte-identical, legacy docs byte-identical, present-only,
Security Contract satisfied); docs updated; closure documented under changelog 1233
(re-verified next-free).
