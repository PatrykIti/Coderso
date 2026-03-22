# TASK-140: Redirects Admin UI Assistant Documentation Refresh
# FileName: TASK-140_Redirects_Admin_UI_Assistant_Documentation_Refresh.md

**Priority:** Medium  
**Category:** Docs  
**Estimated Effort:** Small  
**Dependencies:** `docs/README.md`, `docs/_COVERAGE_MATRIX.md`, `core/admin/ui/redirects/*`  
**Status:** Done (2026-03-22)

---

## Overview

Refresh the assistant-facing documentation for the Redirects surface based on a
real authenticated walkthrough of the local admin UI. The goal is to split
Redirects out of the old combined SEO/Redirects article and replace it with a
guided document that matches the shipped search, table, enable/disable, and
create/edit drawer workflow on `/admin/redirects`.

## Scope

1. Review the current SEO/Redirects assistant doc and the required `docs/`
   authoring contract.
2. Walk the local admin UI on `http://localhost:5173/admin/redirects` with an
   authenticated session and record actual behavior.
3. Create a dedicated Redirects doc using the `Basic / Medium / Instruction /
   Advanced` structure with more guided user instructions.
4. Update the coverage matrix so `/redirects` points to the new canonical doc.
5. Close the task after the docs, board, and changelog are synchronized.

## Sub-Tasks

1. Capture the Redirects page shell:
   - active routes summary,
   - search input,
   - `Create redirect`,
   - table loading/empty/filled state.
2. Capture the redirects table flow:
   - from/to paths,
   - type badge,
   - active/inactive status,
   - last-hit column,
   - edit and enable/disable actions,
   - pagination footer.
3. Capture the drawer flow:
   - create mode,
   - edit mode,
   - source and destination paths,
   - redirect type selector,
   - active toggle,
   - save/cancel actions,
   - built-in SEO tip.
4. Rewrite the doc without keeping Redirects mixed into the same assistant page
   as SEO Manager.

## Acceptance Criteria

1. Redirects has its own assistant doc that describes the current shipped UI.
2. The doc uses the `docs/README.md` contract and is ready for assistant ingest.
3. The draft is explicit about search, create/edit drawers, redirect types, and
   activation flow.
4. The coverage matrix points `/redirects` at the new canonical doc.
5. The task board and changelog reflect that the work is closed.

## Testing Requirements

- Manual authenticated walkthrough of local Redirects UI
- Verify the draft against:
  - `docs/README.md`
  - `docs/_COVERAGE_MATRIX.md`
  - `core/admin/ui/redirects/*`

## Documentation Updates Required

- `docs/screens/redirects.md`
- `docs/_COVERAGE_MATRIX.md`
- `_docs/_TASKS/TASK-140_Redirects_Admin_UI_Assistant_Documentation_Refresh.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/*`

## Validation Executed (2026-03-22)

- Authenticated CDP browser walkthrough completed against local Redirects UI:
  - page shell,
  - empty state,
  - search field,
  - `Create redirect` drawer.
- The local dataset had no existing redirect rows, so edit/toggle table actions
  were verified against source rather than by mutating local redirect data:
  - `core/admin/ui/redirects/RedirectsPage.tsx`
  - `core/admin/ui/redirects/RedirectsTable.tsx`
  - `core/admin/ui/redirects/RedirectDrawer.tsx`
- No automated lint or test commands were run because this was a docs-only
  change.
