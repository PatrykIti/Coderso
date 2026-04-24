# TASK-207-02-01: Entry List AdminShell, PageHeader, and Action Layout
# FileName: TASK-207-02-01_Entry_List_AdminShell_PageHeader_and_Action_Layout.md

**Priority:** High
**Category:** Admin/UI + UX
**Estimated Effort:** Medium
**Dependencies:** TASK-207-02, TASK-207-01-02
**Status:** To Do

---

## Overview

Move `EntryList` onto the same shell/header/action layout used by Pages, Posts,
Menus, and Content Types.

The screen should use `AdminShell`, `PageHeader`, a centered `max-w-6xl` list
container, and an action area where selected-row bulk controls can render inline
to the left of `New`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/entries/EntryList.tsx`
  - replace the primary `SplitShell`/sidebar list layout for the list screen,
  - keep breadcrumbs,
  - render `PageHeader title="Entries"`,
  - keep a compact `New` button,
  - keep `EntryCreateDrawer` and `ContentTypeCreateDrawer` only if the create
    flow still needs collection creation from this surface.
- `tests/vitest/ui/content-entries.test.tsx`
- `tests/vitest/ui/entry-list-wave.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: no new write path; create still uses existing CSRF-backed client.

## Testing Requirements

- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/content-entries.test.tsx tests/vitest/ui/entry-list-wave.test.tsx`

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Entries renders through the same `AdminShell`/`PageHeader` pattern as the
   other content lists.
2. Header action layout does not shift the table when rows are selected.
3. The create action label is compact and consistent with the list pattern.
4. The former type sidebar behavior is represented by filters, not a second
   navigation flow.
