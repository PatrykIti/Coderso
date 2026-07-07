# 1232 - TASK-519 Alpha-Capable Color Input Across All Admin Editors

Date: 2026-07-07
Version: Unreleased
Tasks: TASK-519, TASK-519-01, TASK-519-01-L01, TASK-519-01-L02, TASK-519-02, TASK-519-02-L01, TASK-519-02-L02, TASK-519-03, TASK-519-03-L01, TASK-519-03-L02, TASK-519-03-L03, TASK-519-04, TASK-519-04-L01, TASK-519-04-L02, TASK-519-05, TASK-519-05-L01, TASK-519-05-L02, TASK-519-05-L03, TASK-519-05-L04, TASK-519-05-L05, TASK-519-06

## Key Changes

Everywhere a color is authored in the admin — the menu/page swatch control and
the widget-editor color control — the user can now enter AND round-trip
**alpha-capable** values (8-digit hex `#rrggbbaa` like `#0812209e`, `rgba()`,
`hsla()`, incl. the owner's leading-dot `rgba(8,17,31,.84)`) via a base-color
picker + an **opacity/alpha slider** + a free-text field, while keeping the
**transparent**, **palette-swatch**, and **`var(--color-*)` token** UX. This is a
shared-UI-control upgrade + rollout: the STORAGE (`normalizeMenuColorValue`) and
RENDER (`resolveClearableCssColorValue`) boundaries already accepted these
formats, so there is **NO schema key, NO DDL, NO migration, NO new dependency** —
present-only. Landed strictly in order 519-01 → 519-02 + 519-03 → 519-04 →
519-05 → 519-06 (disjoint single-writer file ownership).

- **Shared admin color-value helper (519-01):** new
  `core/admin/ui/shared/colorValue.ts` — a pure, framework-free parse/compose
  module (`parseColorValue`, `composeHexColor`, `colorAlpha`, `pickerHexFor`,
  `isAlphaPickerRepresentable`, `normalizeAdminColorValue`). Its accepted-set
  patterns are a **read-only MIRROR / subset** of the authoritative whitelist; a
  parity test asserts every value it EMITS via `normalizeAdminColorValue` is
  accepted by `resolveClearableCssColorValue`. **Canonicalization (the ONLY
  normalization):** the render boundary's `rgb/hsl` alpha group requires a leading
  `0` (`0.84`) and REJECTS bare leading-dot `.84`, while the menu write boundary
  also accepts `.84`; the helper accepts `.84` as input but re-emits it as
  `0.84` so BOTH boundaries accept it, and the owner's `rgba(8,17,31,.84)` token
  survives to front render as `rgba(8,17,31,0.84)`. Hex round-trips
  byte-identically; alpha clamped `[0,1]` (NaN/out-of-range → fully opaque);
  transparent stays first-class. The helper NEVER constructs
  `url(`/`expression(`/`javascript:`/`data:`/`;{}<>`.
- **ColorSwatchControl upgrade (519-02, menu/page):**
  `core/admin/ui/pages/editorControls/ColorSwatchControl.tsx` — replaced the
  3/6-digit-only `HEX_COLOR_PATTERN`/`toSafeHexColor` clamp-to-`#000000` with
  `colorValue.ts`-backed parse/compose: the hex text field now accepts hex8/rgba/
  hsla, an **alpha slider** rides alongside the native `<input type="color">` base
  picker, and the swatch preview reflects the real semi-transparent color.
  Editing the base color keeps the current alpha and vice-versa (HI-2). The
  committed value routes through `normalizeAdminColorValue` (leading-dot
  canonicalized). Transparent (`null`) + palette swatches preserved.
- **SharedColorControl + ClearableFields upgrade (519-03, widgets):**
  `core/admin/ui/widgets/editors/ClearableFields.tsx` +
  `SharedColorControl.tsx` — fixed `resolveColorPickerValue`/
  `isPickerRepresentableColorValue` which previously DISCARDED alpha (rgba-with-
  alpha and hex8 fell back to the fallback color); added the alpha slider and
  routed free-text through `normalizeAdminColorValue`. An alpha value now
  classifies as `selected_swatch` (not `saved_custom`) and the swatch preview
  shows the real color. **4 existing assertions re-baselined (519-03-L03)** in
  `tests/vitest/ui/clearable-fields.test.tsx` + `shared-color-control.test.tsx`
  to the new picker-representable behavior — an INTENDED contract change, not a
  weakening.
- **Menu rollout verification (519-04):** the 9 direct `<ColorSwatchControl>`
  sites in `MenuDesignEditor.tsx`, the `swatch()` wrapper, and
  `MenuAppearancePanel.tsx` verified to author + round-trip alpha schema-valid
  via the upgraded shared control — **NO code change needed** (both consume the
  shared control).
- **Widget-editor rollout verification (519-05, 27 editors / 5 clusters):** the
  27 `*Editors.tsx` consume the upgraded `SharedColorControl`, so alpha
  propagates automatically — verification-first, no re-implementations.
  **Widening count: 2** (not the expected 0) — two widgets carried their OWN
  bespoke hex-only render regex stricter than `resolveClearableCssColorValue`:
  `core/widgets/core/footer.tsx` (`normalizeFooterRenderColor`) and
  `core/widgets/core/newsletter.tsx` (`safeHexColorPattern`) were given a
  present-only widening to also accept 4/8-digit (alpha) hex so an authored
  `#rrggbbaa` round-trips at render; legacy 3/6-digit values unchanged.
- **NO schema/DDL/migration (HI-4).** Menu-document and per-widget colors are
  existing `string` fields on `jsonb`; legacy opaque values normalize
  byte-identically; no new key joins any allowlist.
- **Security (HI-5):** the UI helper is a read-only subset of the authoritative
  whitelist; the server-write (`normalizeMenuColorValue`) and render
  (`resolveClearableCssColorValue`) boundaries are UNCHANGED and remain the
  security surface (they reject `url()`/`expression()`/`javascript:`/`data:`/
  `;{}<>`). The two widget widenings match the render whitelist exactly, not a
  looser set.
- **Docs:** `_docs/DESIGN_TOKENS.md` gains an "Admin color-value authoring
  (alpha-capable)" section documenting the base-picker + opacity slider + text
  UX, the authoritative-whitelist / read-only-subset relationship, the
  leading-dot canonicalization, and the present-only (no-migration) storage.
- **Tests:** new `color-value.test.ts` (helper parse/compose + boundary parity),
  `color-swatch-alpha.test.tsx`, `menu-color-alpha.test.tsx`,
  `clearable-fields-alpha.test.tsx`, `shared-color-alpha.test.tsx` (control
  round-trip + slider + transparent/palette preservation); footer/newsletter
  widget tests extended for alpha round-trip; 4 legacy assertions re-baselined.
  Cross-subtask reconcile pass: no unowned test (`menu-design-editor.test.tsx`,
  `page-editor-control-primitives.test.tsx`) still asserts old alpha-dropping.
  All gates green (`bun --cwd core lint`/`lint:types`, root `tsc`,
  `bun run test:bun`, `bun run test:vitest`, `gates:coderso`). The ≥5-scenario
  LIVE alpha-authoring Playwright smoke (light + dark) is run by the orchestrator
  post-merge (the dev host serves the MAIN tree, not this worktree).
