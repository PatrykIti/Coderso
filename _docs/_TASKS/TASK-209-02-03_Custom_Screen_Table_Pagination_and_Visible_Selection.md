# TASK-209-02-03: Custom Screen Table, Pagination, and Visible Selection
# FileName: TASK-209-02-03_Custom_Screen_Table_Pagination_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-02-02
**Status:** To Do

---

## Overview

Extract the Custom Screens table and move it to the shared visible-row
selection and pagination model used by Pages.

This task keeps Custom Screens-specific columns and row links, but the table
behavior should match the Pages table contract.

## Sub-Tasks

No child task files.

## Files to Change

- new `core/admin/ui/custom-screens/CustomScreenTable.tsx`
- new `core/admin/ui/custom-screens/CustomScreenRowActions.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `core/admin/ui/shared/useListPagination.ts`
- `core/admin/ui/shared/ListPaginationFooter.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Implementation Checklist

- Extract the current inline table from `CustomScreenListPage`.
- Add a checkbox column with:
  - `Select all custom screens`;
  - row aria labels like `Select {screen.name}`;
  - indeterminate state when some visible rows are selected.
- Use shared `useListPagination(filteredRows, { resetKey })`.
- Render `ListPaginationFooter resourceLabel="custom screens"`.
- Table columns:
  - Screen: `AdminLink` to `/coderso/custom-screens/:id`, sidebar label hint
    when present;
  - Status: token-backed badge for `active`/`draft`;
  - Content type: human-readable label with id fallback;
  - Mode: derived capability mode label;
  - Sidebar: shortcut label or `Not shown`;
  - Updated;
  - Actions.
- Use mobile row metadata treatment consistent with Pages.
- Keep links through `AdminLink` and the existing `/custom-screens` ->
  `/coderso/custom-screens` canonicalization. Do not add a local path helper.

## Security Contract

- Visibility: internal admin UI only.
- Auth/RBAC: read-only table rendering uses `content:read`.
- CSRF: no write path in this leaf.
- Rate-limit bucket: no new route calls.
- Reject-unknown validation: no new payloads.
- Anti-abuse: selected ids are only visible row ids; later bulk actions must not
  execute hidden ids.

## Testing Requirements

- Table render tests for:
  - empty state,
  - missing content type fallback,
  - active/draft badge labels,
  - sidebar shortcut display,
  - mode label display,
  - visible row selection and select-all behavior,
  - pagination footer range and page-size behavior.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screens table is no longer an inline component inside the page file.
2. Pagination and selection behavior matches Pages.
3. Row links and actions preserve Custom Screens builder/records routes.
4. Hidden rows cannot remain selected after filters or pagination changes.
