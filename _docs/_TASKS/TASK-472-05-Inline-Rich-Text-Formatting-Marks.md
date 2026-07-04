# TASK-472-05: Inline Rich-Text Formatting Marks
# FileName: TASK-472-05-Inline-Rich-Text-Formatting-Marks.md

**Parent Task:** TASK-472
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Medium
**Dependencies:** TASK-471-03 (per-fragment color marks model + inline toolbar),
TASK-464 (sanitizers), TASK-469 (inline edit fidelity)
**Status:** ✅ Done
**Started:** 2026-06-23
**Completed:** 2026-06-23

---

## Topic

Complete the inline mini-toolbar from TASK-471-03 with the rest of fragment
formatting on the same selection: **bold**, **italic**, **link**, and
**highlight** (background color). Builds on the 471-03 marks model + Posts
inline-marks pattern; **must land after TASK-471-03**.

## Current State (summary)

- 471-03 adds a `marks` structure (color-only) + selection toolbar + safe segment
  renderer.
- Sanitizer already permits `strong`/`em`/`i`/`a(href, rel)`
  (`pageAuthoringSanitizers.ts:80-111`); safe href `sanitizeAuthoringLinkHref`;
  safe color `isSafeAuthoringCssColor`.

Helper naming note: TASK-472 moved Page link normalization to the neutral
Page/authoring `normalizeAuthoringSafeHref` helper and kept the Page Editor
canvas contract sections/blocks-only.

## Executable Leaves

| ID | Leaf | Effort |
|----|------|--------|
| TASK-472-05-L01 | Bold / italic / link / highlight marks | Medium |

## Security / Testing / Docs

Link URL + highlight color sinks; full Security Contract in the leaf; rolled up by
TASK-472-06.
