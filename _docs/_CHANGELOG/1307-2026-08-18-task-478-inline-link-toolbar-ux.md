# 1307 - TASK-478 Page Editor Inline Link And Toolbar Placement UX

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-478, TASK-478-01, TASK-478-02, TASK-478-03

## Key Changes

### Pages / Page Editor V2 / Canvas
- Closed TASK-478 as **already implemented** (no new code): the full inline-link
  and dockable-toolbar feature set was committed earlier in `205c66a5` with tests
  tagged `TASK-478-02/03`. A fresh pre-implementation audit (2026-08-18) confirmed
  the source, so the family closed via this changelog instead of a re-implementation.
- `TASK-478-01` Inline Link Visual Feedback: linked runs render with
  `PAGE_TEXT_LINK_MARK_CLASS` (underline + `--coderso-link` color token +
  `data-page-text-mark="link"`) on the front `<a>` and the canvas non-navigating
  span (`core/services/pages/pageStaticBlockRenderers.tsx:337-402`).
- `TASK-478-02` Inline Link Edit, Remove, And Click-To-Select: explicit "Remove
  link" control, URL field seeded from the selected link's href, and canvas
  linked fragments painted as non-navigating spans (`data-page-editor-link-noop`)
  so a click selects instead of navigating.
- `TASK-478-03` Dockable Inline Mark Toolbar: single toggle cycles the mark
  toolbar Top → Right → Left with placement classes, so the native color picker
  no longer covers the edited text.

## Validation

- `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx
  tests/vitest/pages/page-document-v2.test.ts
  tests/vitest/pages/page-renderer-v2.test.tsx` — 235/235 green on HEAD 31952b5f.
- `bun test tests/unit/workflows/taskGraphIntegrity.test.ts` — 6/6 green after
  board/stats update (269 To Do / 6 In Progress / 3515 Done).
- `git diff --check` clean.

## Notes

- Audit finding HIGH-2 (stale anchors: pageRendererV2.tsx vs the real
  pageStaticBlockRenderers.tsx) is resolved by the corrected Evidence section in
  the parent task file.
