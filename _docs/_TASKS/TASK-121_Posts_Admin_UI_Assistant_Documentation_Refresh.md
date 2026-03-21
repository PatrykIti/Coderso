# TASK-121: Posts Admin UI Assistant Documentation Refresh
# FileName: TASK-121_Posts_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/posts/*`  
**Status:** Done (2026-03-21)

---

## Overview

Refresh the assistant-facing documentation for the Posts surface based on a real
authenticated walkthrough of the local admin UI. The goal is to replace the old
combined high-level article with a split, more guided document set that matches
the shipped Posts list, create drawer, block editor shell, runtime preview,
revisions, and editor settings.

## Scope

1. Review the current Posts assistant doc and the required `docs/` authoring
   contract.
2. Walk the local admin UI on `http://localhost:5173/admin/` with an
   authenticated session and record actual behavior for:
   - `/admin/coderso/posts`
   - `/admin/coderso/posts/:id`
3. Split the old combined Posts article into route-aligned docs for:
   - `Posts list + creation`
   - `Post editor + preview + revisions + editor settings`
4. Rewrite the content using the `Basic / Medium / Instruction / Advanced`
   structure with more guided user instructions.
5. Keep this task in `In Progress` until the user reviews the split draft.

## Sub-Tasks

1. Capture the current Posts list flow:
   - list header,
   - search and filters,
   - table columns,
   - row actions,
   - create drawer.
2. Capture the current Post Editor flow:
   - block editor shell,
   - outline/list-view sidebars,
   - top action bar,
   - post/block details,
   - danger zone.
3. Capture supporting surfaces:
   - runtime preview,
   - revisions drawer,
   - editor settings dialog.
4. Rewrite the docs without documenting instance-specific sample content as if
   it were product behavior.
5. Update the coverage matrix so each route family points at one canonical
   assistant document.

## Acceptance Criteria

1. The Posts assistant docs describe the current shipped UI rather than the old
   generic workflow summary.
2. The split docs use the `docs/README.md` contract and are ready for assistant
   ingest.
3. The draft is explicit about list actions, editor workflow, preview behavior,
   revision recovery, and editor preferences.
4. The coverage matrix points `/coderso/posts` and `/coderso/posts/:id` at the
   right canonical docs.
5. The task board reflects that the work is currently under review.

## Testing Requirements

- Manual authenticated walkthrough of `http://localhost:5173/admin/`
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/posts/*`

## Documentation Updates Required

- `docs/coderso/posts-list-and-creation.md`
- `docs/coderso/post-editor-preview-revisions-and-settings.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-121_Posts_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`

## Validation Executed (2026-03-21)

- Real browser walkthrough completed against local admin UI:
  - Posts list,
  - create drawer,
  - block editor shell,
  - runtime preview,
  - revisions,
  - editor settings.
- No automated lint or test commands were run because this is a docs-only draft
  pass.

## Completion Notes (2026-03-21)

- Replaced the old combined Posts assistant article with:
  - `docs/coderso/posts-list-and-creation.md`
  - `docs/coderso/post-editor-preview-revisions-and-settings.md`
- Updated `docs/_COVERAGE_MATRIX.md` so `/coderso/posts` and
  `/coderso/posts/:id` now point to separate canonical docs.
- User review completed before closure.
