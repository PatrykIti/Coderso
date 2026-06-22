# TASK-471-04: Flexible Badge Block
# FileName: TASK-471-04-Flexible-Badge-Widget.md

**Parent Task:** TASK-471
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Blocks
**Estimated Effort:** Medium
**Dependencies:** TASK-471-01 (text-size `xs`/`2xs`)
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Topic

There is no Page Editor V2 badge/pill/chip block. This subtask ships a new
native Page V2 `badge` block that an author can shape freely: text, color, size,
shape, optional icon. Pages no longer use widget documents, so the implementation
must stay in the Page V2 `sections[]` + native blocks contract and must not add
`WidgetBlock`, `WidgetRenderer`, or core widget registry paths.

## Current State (summary)

- No `badge` Page V2 block.
- Page V2 block owners: `pageDocumentV2.ts`, `pageRendererV2.tsx`,
  `pageEditorControlRegistry.ts`, and `pageEditorOptions.ts`.
- Existing Page V2 atomic examples: `divider`, `spacer`, `statistic`, `quote`.
- Color controls use the existing Page Editor swatch model (`input: "color"`).

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-471-04-L01 | Badge block: schema/defaults/normalize, controls, render, tests, docs | Medium |

## Dependencies / Notes

- Depends on **471-01** (badge sizes). Benefits from 471-02 (align) + 471-03
  (color) but does not block on them.
- Decision: native Page V2 block, editor-insertable and assistant-emittable,
  with no widget registry or pack-matrix work.

## Security / Testing / Docs

Introduces validated Page block input (colors/icon) — full Security Contract in
the leaf. Page-model and security docs are rolled up by TASK-471-05.
