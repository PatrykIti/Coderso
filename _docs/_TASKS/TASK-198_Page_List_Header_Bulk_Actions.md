# TASK-198: Page List Header Bulk Actions
# FileName: TASK-198_Page_List_Header_Bulk_Actions.md

**Priority:** Medium
**Category:** CMS/Pages + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-194-01-02
**Status:** Done (2026-04-23)

---

## Overview

Move Pages list bulk actions out of a separate row above the table and into the
existing header action area.

The previous behavior was functionally correct but caused a visible layout jump:
selecting rows inserted a standalone bulk-action bar between filters and the
table. The Pages list should keep the table anchored and show selection controls
inline next to the create action.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/pages/PageListPage.tsx`
  - render Pages bulk actions inside `PageHeader.actions`,
  - keep bulk controls to the left of the create button,
  - rename the create trigger from `Create New Page` to `New`.
- `core/admin/ui/pages/PageBulkActionsBar.tsx`
  - add a compact `inline` variant for header usage,
  - keep the existing `card` variant available for compatibility.
- `tests/vitest/ui/page-list.test.tsx`
  - update the Pages header smoke test for the `New` label.
- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - prove selected Pages rows render the inline bulk controls,
  - preserve existing bulk publish flow coverage.

## Implementation Direction

- Keep selection, publish/unpublish/delete, confirmation, partial failure, and
  refresh semantics unchanged.
- Do not add a new bulk API route or duplicate Pages list state.
- The header action order is:
  - selected-count and bulk action controls,
  - `New`.
- The inline variant may use shorter visible copy, but must preserve accessible
  clear-selection labeling.

## Security Contract

- Visibility: internal admin list only.
- Auth/RBAC/CSRF/rate-limit: unchanged, inherited from the existing per-item
  Pages mutation endpoints.
- Reject-unknown validation: unchanged.
- Anti-abuse: destructive bulk delete still requires confirmation and still
  executes only against the current selected IDs.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/page-list.test.tsx tests/vitest/ui/page-post-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- `_docs/_CHANGELOG/725-2026-04-23-task-198-page-list-header-bulk-actions.md`

## Acceptance Criteria

1. Selecting Pages rows no longer inserts a standalone bulk-action bar above the
   table.
2. Bulk controls appear in the header actions area to the left of `New`.
3. `New` opens the same create drawer as before.
4. Existing bulk action behavior and validation remain unchanged.
