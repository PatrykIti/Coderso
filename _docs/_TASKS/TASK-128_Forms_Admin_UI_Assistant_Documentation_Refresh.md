# TASK-128: Forms Admin UI Assistant Documentation Refresh
# FileName: TASK-128_Forms_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/forms/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Forms surface based on a real
authenticated walkthrough of the local admin UI. The goal is to replace the old
combined article with a split, more guided document set that matches the
shipped forms list, form builder, and action logs workflow.

## Scope

1. Review the current Forms assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/forms`
   - `/admin/coderso/forms/:id`
   - `/admin/coderso/forms/:id/action-runs`
3. Split the old combined Forms article into route-aligned docs for:
   - `forms list + builder`
   - `form action logs`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current forms list flow:
   - list header,
   - create drawer,
   - table contract.
2. Capture the form builder flow:
   - fields/library rails,
   - form settings,
   - automation tab,
   - runtime preview,
   - save flow.
3. Capture the action logs flow:
   - stats cards,
   - status filter,
   - retry action,
   - empty state.
4. Rewrite the docs without documenting instance-specific form names as if they
   were product behavior.
5. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Forms assistant docs describe the current shipped UI rather than the old
   generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about form creation/building and action log
   observability.
4. The coverage matrix points `/coderso/forms` and
   `/coderso/forms/:id/action-runs` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Forms UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/forms/*`

## Documentation Updates Required

- `docs/coderso/forms-list-and-builder.md`
- `docs/coderso/form-action-logs.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-128_Forms_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local admin UI:
  - forms list shell,
  - form builder,
  - form action logs.
- Form creation flow additionally verified against:
  - `core/admin/ui/forms/FormCreateDrawer.tsx`
  - `core/admin/ui/forms/FormTable.tsx`
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-22)

- Replaced the old combined Forms assistant article with:
  - `docs/coderso/forms-list-and-builder.md`
  - `docs/coderso/form-action-logs.md`
- Updated `docs/_COVERAGE_MATRIX.md` so the builder routes and action logs route
  now point to separate canonical docs.
- User review completed before closure.
