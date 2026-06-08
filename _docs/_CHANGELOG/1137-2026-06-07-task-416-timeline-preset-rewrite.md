# 1137 - Timeline MUI-aligned preset gallery rewrite

**Date:** 2026-06-07
**Version:** unreleased
**Tasks:** TASK-416, TASK-416-01, TASK-416-02, TASK-416-03, TASK-416-04

## Key Changes

### Widget contract and rendering (`core/widgets/core/timeline.tsx`)
- Replaced the dual `variant` + `data.mode` model with a single MUI-aligned preset
  set as the block `variant`s: `vertical-right`, `vertical-left`, `alternating`,
  `alternating-opposite`, `cards`, `compact`. The `mode`/`layout`/`guides`/old
  `style` fields are gone.
- Added the MUI capability surface to the data contract and renderer: axis position
  (`left`/`right`/`alternate`/`alternate-reverse`), per-step opposite content
  (rendered as a semantic `<time>`), dot variant (`filled`/`outlined`), and
  semantic dot tones (`primary`/`secondary`/`success`/`error`/`warning`/`info`/
  `grey`) mapped to theme tokens. Custom-icon dots are kept; the hardcoded `emerald`
  status color was removed.
- Introduced one exported `timelineVariantCapabilities` table consumed by normalize,
  render, and the editor so the editor only shows controls the active preset renders
  ("shown ⇒ rendered"). This fixes the prior bug where many Visual options did not
  reflect in the page-builder canvas.
- Collapsed the five layout renderers into two parameterized primitives
  (vertical + horizontal); `normalizeTimelineData` deep-resolves every nested group
  from defaults and coerces fields to the active preset's allowed set.

### Editor (`core/admin/ui/widgets/editors/TimelineEditors.tsx`)
- Wizard is an interactive single-shot **preset gallery** (clickable cards that change
  the variant) plus a read-only summary — no more greyed-out fixed preset field.
- Visual is preset-gated (axis position and opposite-content controls appear only for
  the alternating presets; compact/cards hide them) and reorganized into labeled
  `FieldGroup` sections with controls stacked one per row for readability.
- Dots support **any lucide icon** (graphics instead of plain dots): the editor shows
  ~16 quick picks plus a `+` button opening a searchable dialog over the full lucide
  library; a global `dot.icon` and per-step `markerIcon` overrides render as SSR `<svg>`
  via a kebab→component map built from lucide's `icons` record.
- The per-widget editor panel is narrow, so the preset gallery and all controls are
  single-column/stacked (no viewport `md:` grids in the panel).
- Advanced is read-only diagnostics.
- New `timelineEditorContract` (version 2) passes the editor-contract validator with
  an explicit `variant` duplicate-writable allowance shared by Wizard and Visual.

### Tests, docs, and board
- Rewrote `tests/vitest/widgets/timeline.test.tsx` (schema, normalize,
  per-preset render, dot variant/tone tokens, capability shown⇒inert invariant,
  safe-href/link-nesting, a11y, contract validity, and canvas-vs-public parity) and
  the `tests/vitest/ui/timeline-editor-wave.test.tsx` interactive editor coverage.
  Updated the timeline fixtures in `renderer`, `styleNoneTokens`, `visualPanel`,
  `widget-template-editor`, and the Bun `validator` suite to the new shape.
- Rewrote `_docs/_WIDGETS/TIMELINE.md` to v2 and updated the timeline token-ownership
  rows in `_docs/WIDGETS.md` (`timeline.spacing.*`, `timeline.spacing.maxWidth`,
  `timeline.typography.*`).

## Notes

- Clean break: this is not backward-compatible with v1 timeline payloads. Grep
  confirmed no code seeds a `type:"timeline"` block, so the only affected instances
  are author-created pages, which must re-add the widget.
- The renderer diagnostic attributes were renamed
  (`data-timeline-variant`/`orientation`/`surface`/`axis-position`/`dot-variant`/
  `dot-tone`/`dot-size`); any recorded Playwright inventory referencing the old
  `data-timeline-mode`/`label-position`/`marker-display` names should be regenerated.
- No `core/widgets/modulePackMatrix.ts` change is required (timeline is not in the
  pack matrix).
- Token aliasing: the front theme has no native success/warning/info tokens, so
  those tones alias `primary`/`accent`/`secondary` (documented in `TIMELINE.md`).

## Validation

- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `bun run test:vitest -- tests/vitest/widgets tests/vitest/pageBuilder`: passed,
  69 files / 779 tests (includes the rewritten timeline, editor-contract, renderer,
  styleNoneTokens, visualPanel, widget-template-editor suites).
- `bun run test:vitest -- tests/vitest/ui/timeline-editor-wave.test.tsx`: passed.
- `bun test tests/unit/widgets/validator.test.ts`: passed, 34 tests.
- Live host via `coderso-dev-core-host`: booted cleanly with the rewritten widget
  (API 200, core server listening, admin/site Vite ready). `playwright-cli` loaded
  the admin in a real browser, authenticated successfully, and created a builder
  page — confirming the rewritten admin editor bundle compiles and mounts with no
  client errors beyond the expected pre-login 401. The full visual click-through
  (insert Timeline, cycle all six presets across canvas/admin preview/public front)
  remains a manual confirmation step; the automated public-vs-editor-preview render
  parity and capability "shown⇒rendered" invariant tests already cover that contract.
