# TASK-215-02-01: Section-Aware Filter Model and Counts
# FileName: TASK-215-02-01_Section_Aware_Filter_Model_and_Counts.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-02
**Status:** Done (2026-04-26)

---

## Overview

Extend the Widget Library filter utilities so section dropdown choices, search,
widget-specific filters, template category filters, and counts all share one
deterministic model.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/ui/widgets/types.ts` if shared section/view types are extracted.
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/ui/widget-library.test.tsx`

## Security Contract

- Visibility: internal admin UI filter state.
- Auth model: unchanged.
- RBAC: unchanged `widgets:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged `admin_read`.
- Reject-unknown validation: section and filter ids are closed enums.
- Anti-abuse: filters stay client-side over already authorized rows.

## Pseudocode

```ts
export type WidgetLibrarySectionId =
  | "all-items"
  | "favorites"
  | "templates"
  | "widgets-all"
  | WidgetCategoryId;

export function filterWidgetLibraryRows(rows, state) {
  return rows.filter((row) => matchesSection(row, state.section))
    .filter((row) => matchesSearch(row, state.query))
    .filter((row) => matchesSectionFilters(row, state));
}
```

## Testing Requirements

- `All Items` includes core widgets and templates.
- `Favorites` includes favorite core widgets and favorite templates.
- `Templates` includes only template source rows and respects category filter.
- `All Widgets` includes only core widget source rows.
- Category sections include only core widgets from that category.
- Counts match the same filter basis as the result rows.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widgetLibraryUtils.test.ts tests/vitest/ui/widget-library.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Section counts cannot drift from visible rows.
2. The section dropdown fully replaces the rail state model.
3. Search/filter state resets pagination and trims hidden selection.
