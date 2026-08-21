# TASK-481-04: WYSIWYG Tests, Docs & Closure

# FileName: TASK-481-04-WYSIWYG-Tests-Docs-And-Closure.md

**Parent Task:** TASK-481
**Priority:** Medium
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-481-01, TASK-481-02, TASK-481-03
**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-19
**Changelog:** 1317 (created at TASK-481 closure)

---

## Overview

End-to-end WYSIWYG assertion + documentation + cross-task reciprocity. Proves the
success criteria as a single behavior (site brand value inside the content scope;
admin brand value on chrome; neutral non-regression; live cache-bus repaint),
adds a real-input Playwright smoke (synthetic-event tests are insufficient per
memory `page-editor-color-toolbar-live-findings`), and records the design + the
explicit non-edit of `globals.css @theme` in the docs and the reciprocal TASK-479
notes.

## Sub-Tasks

| ID | Title | Effort | Status |
| --- | --- | --- | --- |
| TASK-481-04-L01 | Brand-WYSIWYG vitest + real-input Playwright smoke | Small | ✅ Done |
| TASK-481-04-L02 | Docs + TASK-479-05-L03 / TASK-479-08-L02 reciprocity | Small | ✅ Done |

## Dependencies

- TASK-481-01/02/03 (the behavior under test must be implemented first).
- L01 → L02.

## Testing Requirements

- Vitest lane: `tests/vitest/ui/page-authoring-canvas.test.tsx` end-to-end brand
  WYSIWYG assertion.
- Playwright real-input smoke via the `playwright-cli` skill against the local
  admin (`http://coderso-a.localhost:5173/admin/`) — real mouse/keyboard, per
  memory; this is a manual/scripted smoke, not a CI Bun/Vitest gate.
- L02 is docs-only (no test).
