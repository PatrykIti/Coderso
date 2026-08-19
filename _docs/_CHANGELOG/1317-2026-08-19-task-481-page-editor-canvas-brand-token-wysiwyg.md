# 1317. Page Editor Canvas Brand Token WYSIWYG

**Date:** 2026-08-19
**Version:** 0.1.0
**Tasks:** TASK-481 (TASK-481-01, TASK-481-02, TASK-481-03, TASK-481-04; 9 executable leaves)

---

## 🚀 Key Changes

### Pages / Page Editor V2 / Canvas

- **Content-scope canvas split (481-01).** The page editor canvas is now split
  into a CHROME layer (selection outline/ring, badges, ghost insert tiles) and a
  CONTENT scope (`data-page-editor-content`) that holds the rendered page
  content and its brand-consuming inline style. `PageAuthoringCanvas` was split
  into `PageAuthoringCanvasInline` + facade so the two layers keep distinct CSS
  variable scopes.
- **Admin brand re-assertion on chrome (481-01-L02).** Chrome re-asserts the
  admin brand (`adminBrandColorCssVariableMap`: `--color-primary: var(--primary)`,
  ...) on section/block frames, so selection outlines and ghost tiles keep the
  admin theme even when nested inside an ancestor content scope — no brand bleed
  into the editor chrome.
- **Brand token canvas emission + live wiring (481-02).**
  `toPageCanvasBrandColorCssVariableMap` emits only the four BRAND site vars
  (`--color-primary/-secondary/-accent/-border`) on the content scope, so block
  and inline brand colors render the SAME value as the front (WYSIWYG). Neutral
  site vars remain on the canvas frame (TASK-477-02 ownership). The PageEditor
  facade was split into 7 cohesive modules (all <= 1000 lines) and the brand
  map is wired through `canvasBrandTokenVariables` → `contentBrandTokenVariables`.
- **Editor control preview unification (481-03).** The live site palette now
  feeds the inline text-color toolbar (shared `PageEditorColorPaletteContext`,
  `useCanvasSiteSettings`), so the inline toolbar swatch preview, the block
  color control, and the in-canvas render all agree on the same resolved site
  token value.
- **Cache-bus live repaint fix (481-04, smoke S4 blocker).**
  `useCanvasSiteSettings` previously re-read only the REDACTED settings cache
  after a `settingsRedacted` cache-bus event; since the redacted payload never
  carries `design.tokens`, the canvas reverted to default tokens instead of
  repainting. It now revalidates the FULL settings payload via
  `getSettingsCached({ force: true })` on mount and on the cache-bus event,
  falling back to the redacted cache only on error (AdminApp.refreshSettings
  pattern). Content scopes repaint to the new site accent immediately after a
  settings write.

### Testing

- 481-01-L03: content-scope characterization suites (harness + 4 suites, 24/24).
- 481-02-L01: brand-map contract tests (8/8).
- 481-02-L02: facade-parity + wiring regression tests (40/40 across 6 suites).
- 481-03-L01: live-palette inline toolbar tests (39/39); 481-03-L02 inline/block/
  in-canvas agreement tests (20/20).
- 481-04-L01: brand WYSIWYG Vitest (18/18) with the real redaction contract plus
  a 7-scenario real-input Playwright smoke (wf481smoke2): inline accent, chrome
  admin isolation, toolbar URL + custom color, **live repaint** (critical),
  cross-device, dark mode, publish → front parity — 7/7 PASS, 0 console errors,
  8 screenshots sha256-verified.

### Docs

- `_docs/DESIGN_TOKENS.md` gained the "Page editor canvas: brand vs neutral
  token resolution (TASK-481)" section including the cross-task boundary note
  (globals.css `@theme` unchanged; TASK-479-05-L03 / TASK-479-08-L02 owners).

---

## Validation

- Root `tsc` + `core lint` + `core lint:types` green.
- 481 Vitest matrix 65/65 green; line gate <= 1000 lines for all touched
  production modules and test files.
- Post-implementation 5-lens audit 0 HIGH / 0 MEDIUM.
- Smoke-audit 0 HIGH / 0 MEDIUM (report schema-valid, screenshots sha256-match).
- Runtime smoke `wf481smoke2` 7/7 PASS including the critical live-repaint
  scenario; HomePage returned to draft after smoke; shared DB settings restored.
