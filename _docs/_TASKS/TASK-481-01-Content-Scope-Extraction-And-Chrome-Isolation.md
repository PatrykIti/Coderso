# TASK-481-01: Content-Scope Extraction & Chrome Isolation

# FileName: TASK-481-01-Content-Scope-Extraction-And-Chrome-Isolation.md

**Parent Task:** TASK-481
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-477-02 (canvas neutral tokens + live swatch palette)
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (created at TASK-481 closure)

---

## Overview

Foundation for the whole task: split the page-editor canvas block/section frame into
a **content-only scope** (the rendered page content + its brand-consuming inline
style) and a **chrome layer** (selection outline/ring, type/override/visibility
badges, ghost "+" insert tiles, "add block beside" handle) so a later leaf can
emit the SITE brand `--color-*` on the content scope WITHOUT recoloring chrome.

Today the block frame `<div>` in `renderBlockFrame`
(`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` ~1058–1102) is a single element
that carries BOTH the chrome utility classes (`outline-primary`, `ring-primary/20`)
AND `style={blockRenderProps.style}` — and `blockRenderProps.style`
(`toPageBlockStyle`, defined in `core/services/pages/pageBlockRenderStyles.ts`:266,
imported by `core/services/pages/pageRendererV2.tsx`:903) includes the
block's brand visual style (`backgroundColor`/`color`/`borderColor`, which may be
`var(--color-accent)` etc.). Because chrome and content brand-consumers share one
element and one variable cascade, emitting site brand vars there would recolor the
chrome — the exact reason TASK-477-02 left brand out. This subtask makes them
separable: a `data-page-editor-content` wrapper for content + brand style, with
chrome staying outside it, and an admin-brand re-assertion on the chrome frame so
nested chrome inside an ancestor content scope keeps the admin theme.

No behavior change ships from this subtask alone (no site brand emitted yet); it is
a structure + guard-test refactor that the emission subtask (02) builds on.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-481-01-L01 | `data-page-editor-content` wrapper in renderBlockFrame + section content | Medium | ✅ Done |
| TASK-481-01-L02 | `adminBrandColorCssVariableMap` re-assertion on section/block chrome | Small | ✅ Done |
| TASK-481-01-L03 | Content-scope / chrome-isolation characterization tests | Small | ✅ Done |

## Dependencies

- TASK-477-02 (the canvas already threads `canvasSiteTokenVariables` neutrals on
  `data-page-editor-canvas-frame` and a live `sitePalette`; this subtask builds the
  content-scope split inside that frame).
- L01 → L02 → L03 in order (L02 re-asserts admin brand on the frame established by
  L01; L03 characterizes both).
- Coordinate (do NOT edit) TASK-479-08-L02 which restyles the same
  `data-page-editor-canvas-frame` chrome; this subtask adds an INNER content scope
  and does not alter `canvasSiteTokenVariables` or the `data-page-editor-canvas-*`
  contract.

## Testing Requirements

- Vitest lane only (pure admin-UI render structure; no runtime/route/DB surface):
  `tests/vitest/ui/page-authoring-canvas.test.tsx`.
- Assert the content wrapper exists, that chrome (`outline-primary`/`ring`, type and
  override badges, ghost tiles, add-beside handle) renders OUTSIDE the content
  wrapper, that the block brand visual style is co-located with the content scope,
  and that the admin-brand re-assertion is present on section + block frames.
- Neutral non-regression: the `canvasSiteTokenVariables` neutral map shipped by
  TASK-477-02 still resolves in-canvas (no change to neutrals).
