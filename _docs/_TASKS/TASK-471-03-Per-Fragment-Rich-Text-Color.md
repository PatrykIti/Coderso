# TASK-471-03: Per-Fragment Rich-Text Color
# FileName: TASK-471-03-Per-Fragment-Rich-Text-Color.md

**Parent Task:** TASK-471
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Large
**Dependencies:** TASK-464 (authoring sanitizers), TASK-469 (rich-text inline
edit fidelity)
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Topic

Authors can only set a single block-wide text color. This subtask lets an author
**select a fragment** of text on the canvas (hero header/heading/paragraph) and
recolor only that fragment, so one heading can carry 2–4 colors — via an inline
**mark** model, a selection mini-toolbar, a sanitizer that allows validated color
spans, and a renderer that paints marked segments.

**Reuse mandate:** the Posts editor already implements inline mark selection +
rendering; share/adapt that contract rather than forking a parallel system.

## Current State (summary)

- Text is a flat string; `text` block has `format: plain|rich` (`pageDocumentV2.ts`).
- Inline edit strips markup / rejects rich (`pageInlineEditContract.ts:114-115,
  249-263, 289-295`).
- Sanitizer allowlist is structural-only (`pageAuthoringSanitizers.ts:80-111`);
  color primitive `isSafeAuthoringCssColor`.
- Renderer `renderTextBlock`/`renderHeading` (`pageRendererV2.tsx:718-771`); no
  per-segment paint; no `dangerouslySetInnerHTML`.
- Posts reference: `tests/vitest/ui/post-richtext-inline-typography-selection.test.ts`,
  `post-richtext-inline-wrapper.test.ts`.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-471-03-L01 | Text color marks model + inline swatch toolbar + safe render | Large |

## Dependencies / Notes

- Coordinate with **TASK-469** (shared inline-edit contract + renderer).
- Color-only here; bold/italic/link/highlight are **TASK-472-05** (backlog).
- This subtask's marks model is the dependency for TASK-472-05.

## Security / Testing / Docs

Introduces validated input (color marks) persisted via existing routes — full
Security Contract in the leaf. Tests + docs in the leaf; rolled up by TASK-471-05.
