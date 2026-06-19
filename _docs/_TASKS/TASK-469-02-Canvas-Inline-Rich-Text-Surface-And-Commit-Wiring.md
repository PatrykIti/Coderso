# TASK-469-02: Canvas Inline Rich-Text Surface And Commit Wiring
# FileName: TASK-469-02-Canvas-Inline-Rich-Text-Surface-And-Commit-Wiring.md

**Parent Task:** TASK-469
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Admin Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-469-01
**Status:** ⏳ To Do

---

## Overview

Wire the admin canvas to the new rich-aware contract. `InlineEditableCanvasText`
in `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` must activate a
`contentEditable` surface for `format:"rich"` targets (seeded from the rendered
rich tree, not the plain-text fallback), read the edited HTML on commit, and route
it through `commitInlineText` (which now dispatches to the rich sanitizer).
Plain-text targets keep their existing behavior. Result: inline ↔ panel parity.

## Sub-Tasks

- [ ] TASK-469-02-L01: Canvas Rich ContentEditable And Panel Parity

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/pages/editor/PageAuthoringCanvas.tsx` | Rich `contentEditable` branch in `InlineEditableCanvasText`; read innerHTML on commit for rich targets; preserve plain-text path. |
| (canvas inline-edit UI flow suite) | Rich round-trip + plain-text no-regression coverage. |

## Implementation Pseudocode

Full shape lives in TASK-469-02-L01. Branch the editable surface on
`target.preserveMarkup`: rich targets render the sanitized rich `children` inside
the `contentEditable` and commit `element.innerHTML`; plain targets keep the
existing text reader. Both commit through `commitInlineText`.

## Security Contract

- **Endpoint visibility:** none; admin UI only.
- **Auth / RBAC:** existing Pages `content:write`; no change.
- **CSRF / Rate-limit:** unchanged.
- **Validation:** commit output is the contract sanitizer's output, never raw
  innerHTML; no new `dangerouslySetInnerHTML`; renderer keeps the tokenized tree.
- **Secret handling:** no secrets in canvas state or cache.

## Testing Requirements

- Canvas inline-edit UI flow suite (rich round-trip + plain no-regression).
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None at subtask level; closure docs in TASK-469-03.

## Acceptance Criteria

1. A `format:"rich"` block is inline-editable on the canvas and preserves
   bold/italic/link on commit.
2. The committed value matches what the panel "Primary text" field would persist.
3. Plain-text inline targets are unchanged.
4. No new `dangerouslySetInnerHTML`; React Hooks lint clean.
