# TASK-120: Pages Admin UI Assistant Documentation Refresh
# FileName: TASK-120_Pages_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** docs/README.md, `docs/_COVERAGE_MATRIX.md`, `_docs/PAGE_MODEL.md`, `core/admin/ui/pages/*`  
**Status:** In Progress (2026-03-21)

---

## Overview

Refresh the assistant-facing documentation for the Pages surface based on a real
authenticated walkthrough of the local admin UI. The goal is to replace the
legacy short-form article with a current multi-level document that matches the
shipped Pages list, create drawer, Page Editor, runtime preview, page settings,
and history surfaces.

## Scope

1. Review the current Pages assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior.
3. Rewrite `docs/screens/pages-preview-and-page-editor.md` using the new
   `Basic / Medium / Instruction / Advanced` structure.
4. Keep this task in `In Progress` until the user reviews the draft.

## Sub-Tasks

1. Capture the current Pages list flow:
   - search,
   - status/author filters,
   - table structure,
   - create drawer entry point.
2. Capture Page Editor shell behavior:
   - widget/template/form library,
   - editable canvas,
   - details panel,
   - top action bar.
3. Capture supporting surfaces:
   - runtime preview,
   - page settings,
   - history / revisions.
4. Rewrite the doc without documenting instance-specific sample content as if it
   were product behavior.

## Acceptance Criteria

1. The Pages assistant doc describes the current shipped UI rather than the old
   generic workflow summary.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about list actions, editor layout, preview behavior,
   settings, and revision/history flow.
4. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of `http://localhost:5173/admin/`
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `_docs/PAGE_MODEL.md`
  - `core/admin/ui/pages/*`

## Documentation Updates Required

- `docs/screens/pages-preview-and-page-editor.md`
- `_docs/_TASKS/TASK-120_Pages_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-21)

- Real browser walkthrough completed against local admin UI:
  - login screen,
  - Pages list,
  - create drawer,
  - Page Editor,
  - Page settings,
  - History,
  - Runtime preview.
- No automated lint or test commands were run because this is a docs-only draft
  pass pending user review.
