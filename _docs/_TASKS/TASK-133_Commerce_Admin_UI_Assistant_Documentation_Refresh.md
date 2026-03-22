# TASK-133: Commerce Admin UI Assistant Documentation Refresh
# FileName: TASK-133_Commerce_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/commerce/*`  
**Status:** In Progress (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Commerce surface based on a
real authenticated walkthrough of the local admin UI. The goal is to replace
the old combined article with a split, more guided document set that matches
the shipped commerce catalog list and product editor workflows.

## Scope

1. Review the current Commerce assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/commerce`
   - `/admin/coderso/commerce/:id`
3. Split the old combined Commerce article into route-aligned docs for:
   - `commerce catalog`
   - `commerce product editor`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current catalog flow:
   - list header,
   - search,
   - status tabs,
   - product table contract,
   - empty/loading state.
2. Capture the current product editor flow:
   - context panel,
   - identity,
   - pricing,
   - stock,
   - collections,
   - media IDs,
   - save/publish/discard actions.
3. Rewrite the docs without pretending the local product list is more populated
   than the current instance shows.
4. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Commerce assistant docs describe the current shipped UI rather than the
   old generic commerce summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about catalog review and product editor workflow.
4. The coverage matrix points `/coderso/commerce` and
   `/coderso/commerce/:id` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Commerce UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/commerce/*`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `docs/coderso/commerce-product-editor.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-133_Commerce_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-22)

- Real browser walkthrough completed against local Commerce UI:
  - commerce list shell,
  - commerce product editor in `new` mode.
- List/table contract additionally verified against:
  - `core/admin/ui/commerce/CommerceListPage.tsx`
  - `core/admin/ui/commerce/CommerceTable.tsx`
- No automated lint or test commands were run because this is a docs-only draft
  pass pending user review.
