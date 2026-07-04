# TASK-472-02: Block Background Authoring
# FileName: TASK-472-02-Block-Background-Authoring.md

**Parent Task:** TASK-472
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Background
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Topic

Block background authoring is half-wired: gradients are a raw CSS string the
author must paste, and block background image is allowed by the schema
(`backgroundType`) but has no media picker for blocks (only sections). This
subtask adds a visual gradient editor and wires block background image, reusing
the existing gradient sanitizer and the section media-URL policy.

## Current State (summary)

- Background controls: `pageEditorControlRegistry.ts:384-404` (`background` is a
  `color` input; `backgroundType` select).
- Gradient render: `pageRendererV2.tsx:458-459` (`toGradientBackground`).
- Sections expose a bg-image media picker; blocks do not.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-472-02-L01 | Visual gradient editor | Medium |
| TASK-472-02-L02 | Block background image wiring | Medium |

## Security / Testing / Docs

Gradient CSS + media-URL sinks — reuse existing sanitizers; full Security
Contracts in the leaves; rolled up by TASK-472-06.
