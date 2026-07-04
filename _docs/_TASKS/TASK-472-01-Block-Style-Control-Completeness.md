# TASK-472-01: Block Style Control Completeness
# FileName: TASK-472-01-Block-Style-Control-Completeness.md

**Parent Task:** TASK-472
**Priority:** High
**Category:** Pages / Page Editor V2 / Controls
**Estimated Effort:** Small
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Topic

Two block-frame style controls are incomplete: **margins** are registered and
painted but missing from the Spacing panel (schema↔UI desync), and **border**
exposes only a color while the renderer hardcodes `1px solid` (no width/style).
Both are cheap quick-wins: surface/wire existing block-frame style controls.

## Current State (summary)

- Margins registered like padding: `pageEditorControlRegistry.ts:451-476`;
  painted: `pageRendererV2.tsx:511`.
- Border hardcoded: `pageRendererV2.tsx:464-466`; only `block.style.borderColor`
  control (`:442-450`); no `borderWidth`/`borderStyle` in `PageBlockStyleV2`.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-472-01-L01 | Surface block margin controls in the Spacing panel | Small |
| TASK-472-01-L02 | Block border width & style controls | Small |

## Security / Testing / Docs

No new endpoints; numeric clamp + enum reject-unknown (border). Detail/tests in
the leaves; rolled up by TASK-472-06.
