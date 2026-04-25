# TASK-209-02-02: Custom Screen Filters for Search, Status, and Content Type
# FileName: TASK-209-02-02_Custom_Screen_Filters_Status_Content_Type_and_Search.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-209-02, TASK-209-01-02
**Status:** To Do

---

## Overview

Add a Pages-style compact filter bar for Custom Screens.

The list should be searchable and quickly scannable without introducing a
second screen or sidebar. Filters are client-side like the current Pages list.

## Sub-Tasks

No child task files.

## Files to Change

- new `core/admin/ui/custom-screens/CustomScreenFilters.tsx`
- `core/admin/ui/custom-screens/CustomScreenListPage.tsx`
- `tests/vitest/ui/custom-screens-page.test.tsx`
- `tests/vitest/ui/custom-screens-list-wave.test.tsx`

## Implementation Checklist

- Add a pure filter helper:

```ts
export function filterCustomScreenRows(
  rows: CustomScreenListRow[],
  query: string,
  status: "all" | "active" | "draft",
  contentTypeId: string
) {
  // Match screen name, sidebar label, content type label, and contentTypeId.
}
```

- Filter controls:
  - search input with icon and aria label,
  - status select: all, active, draft,
  - content type select: all plus available content types and any row-derived
    missing `contentTypeId` fallback options.
- Reset pagination through the `useListPagination` `resetKey` when any filter
  changes.
- Trim hidden selected rows after filters change.
- Empty states:
  - no screens at all: "No custom screens yet." or create-focused equivalent;
  - filters hide all rows: "No custom screens match your current filters."
- Do not add URL query state in this task unless a separate routing task is
  created.

## Security Contract

- Visibility: internal admin UI only.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: no additional permissions beyond list reads; the underlying list data
  remains `content:read`.
- CSRF: no write path.
- Rate-limit bucket: no new route calls.
- Reject-unknown validation: no route query parameters; filters are local UI
  state.
- Anti-abuse: local filtering must not expand selection beyond visible rows.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Unit test for `filterCustomScreenRows`.
- Mounted list test covering search, status filter, content type filter, reset
  behavior, and filtered empty state.
- Include a fallback content-type filter case for a row whose label is missing
  but whose stable `contentTypeId` is still present.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Search matches screen name, sidebar label, content-type label, and stable
   content type id.
2. Status and content-type filters combine deterministically with search.
3. Filter changes reset pagination and trim hidden selections.
4. Empty states distinguish true empty data from filtered-empty data.
5. Missing content-type labels do not remove rows from the content-type filter
   model.
