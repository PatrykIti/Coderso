# 1158 - TASK-418 Page template boundary freeze

**Date:** 2026-06-10
**Version:** Unreleased
**Tasks:** TASK-418-06-L03

## Key Changes

### Pages And Templates

- Added `pageTemplateBoundary` as the Pages-owned helper for Page v2 template
  input and non-Page legacy widget surface contracts.
- Routed Page v2 public/runtime rendering through the new helper while
  preserving stored legacy Page row reset compatibility.
- Froze widget-template, custom-screen, and detail-page surfaces outside the
  Page v2 Page Templates path so TASK-418 does not silently rewrite unrelated
  editors.
- Created follow-up `TASK-420` plus three physical child tasks for deleting and
  replacing the obsolete Advanced Widgets/widget-template path with a dedicated
  Page Templates surface.

### QA And Docs

- Added Vitest boundary coverage for Page v2 template input, fresh legacy
  `blocks[]` rejection, non-Page legacy widget contracts, and Page v2 documents
  rejected at widget-template/custom-screen/detail-page boundaries.
- Ran targeted Bun runtime coverage for Pages runtime, widget-template preview
  route registration, and detail-page runtime-lite behavior.
- Updated `_docs/PAGE_MODEL.md`, `_docs/CMS_SPEC.md`, `_docs/WIDGETS.md`,
  `_docs/ARCHITECTURE.md`, and TASK-418/TASK-420 task files.
- Local pre-implementation audit corrected the task contract so fresh
  cross-surface boundary failures do not conflict with stored legacy Page row
  read/render reset compatibility.
- Claude read-only drift audit ran with `--effort xhigh` and a 1500-second
  command timeout. The first pass found a stale changelog pointer and the
  TASK-420 obsolete-surface ownership gap; both were corrected, and the second
  pass reported no unresolved drift.
- TASK-420 now explicitly requires Claude read-only drift audits with
  `--effort xhigh`, no artificial audit budget, up to 25 minutes wait per pass,
  `coderso-dev-core-host` for server smoke, `playwright-cli` browser validation,
  and `.env`-loaded local credentials/settings without sending secrets to
  external agents.
