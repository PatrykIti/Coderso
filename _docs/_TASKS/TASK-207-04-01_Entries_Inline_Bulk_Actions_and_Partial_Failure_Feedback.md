# TASK-207-04-01: Entries Inline Bulk Actions and Partial-Failure Feedback
# FileName: TASK-207-04-01_Entries_Inline_Bulk_Actions_and_Partial_Failure_Feedback.md

**Priority:** High
**Category:** Admin/UI + CMS/Entries
**Estimated Effort:** Medium
**Dependencies:** TASK-207-04, TASK-207-02-03
**Status:** To Do

---

## Overview

Move Entries bulk actions from a full card below filters into the inline
`PageHeader.actions` pattern.

The behavior should match the visible-scope model used by Pages, Posts, Menus,
and Content Types.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
- `core/admin/ui/entries/EntryBulkActionsBar.tsx`
- `tests/vitest/ui/entry-bulk-actions.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI.
- Auth model: existing authenticated admin API.
- RBAC: existing route permissions through `entriesClient`.
- CSRF: inherited from existing client helpers.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: existing route schemas.
- Anti-abuse: actions run only for controlled visible selected IDs.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/entry-bulk-actions.test.tsx tests/vitest/ui/entry-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Bulk actions render inline beside `New`.
2. Bulk controls are hidden when nothing is selected.
3. Apply is disabled without an action or while running.
4. Success, failure, and partial-failure feedback is visible.
5. Selection clears only on full success; actionable failures preserve context.
