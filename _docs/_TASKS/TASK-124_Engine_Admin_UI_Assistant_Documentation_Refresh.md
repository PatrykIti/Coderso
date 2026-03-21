# TASK-124: Engine Admin UI Assistant Documentation Refresh
# FileName: TASK-124_Engine_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/content-types/*`  
**Status:** Done (2026-03-21)

---

## Overview

Refresh the assistant-facing documentation for the Coderso Engine surface based
on a real authenticated walkthrough of the local admin UI. The goal is to
replace the old combined article with a split, more guided document set that
matches the shipped content type list, create drawer, content type editor, and
schema builder route.

## Scope

1. Review the current Engine assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/engine`
   - `/admin/coderso/engine/:id`
   - `/admin/coderso/engine/:id/schema`
3. Split the old combined Engine article into route-aligned docs for:
   - `Content types list + creation`
   - `Content type editor + schema builder`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current list flow:
   - list header,
   - table columns,
   - existing content types,
   - `New type` drawer.
2. Capture the current content type editor flow:
   - field list,
   - field settings,
   - taxonomy toggles,
   - preview/schema panel,
   - save/publish actions.
3. Capture the separate schema builder route:
   - collections sidebar,
   - field cards,
   - schema preview,
   - save/discard actions.
4. Rewrite the docs without documenting instance-specific type names as if they
   were product behavior.
5. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Engine assistant docs describe the current shipped UI rather than the old
   generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about list actions, content type setup, field editing,
   taxonomy controls, and schema builder flow.
4. The coverage matrix points `/coderso/engine`, `/coderso/engine/:id`, and
   `/coderso/engine/:id/schema` at the right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of local Engine UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/content-types/*`

## Documentation Updates Required

- `docs/coderso/engine-list-and-content-type-creation.md`
- `docs/coderso/content-type-editor-and-schema-builder.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-124_Engine_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-21)

- Real browser walkthrough completed against local admin UI:
  - Engine content types list
  - `New type` drawer
  - content type editor
  - schema builder route
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-21)

- Replaced the old combined Engine assistant article with:
  - `docs/coderso/engine-list-and-content-type-creation.md`
  - `docs/coderso/content-type-editor-and-schema-builder.md`
- Updated `docs/_COVERAGE_MATRIX.md` so the list route and editor/schema routes
  now point to separate canonical docs.
- User review completed before closure.
