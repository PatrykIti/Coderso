# TASK-213-03-02: Advanced Mode Module Readiness and Tab Counts
# FileName: TASK-213-03-02_Advanced_Mode_Module_Readiness_and_Tab_Counts.md

**Priority:** Medium
**Category:** Widget Library + Filters + Pack Matrix
**Estimated Effort:** Medium
**Dependencies:** TASK-213-03, TASK-054-25, TASK-054-16-03
**Status:** To Do

---

## Overview

Fix filter-control findings `BUG-7`, `UX-2`, and `UX-3`.

The library should keep pack-aware filtering, but editors should not see
developer-centric `Needs coverage` copy or global tab counts that contradict the
active category.

This leaf owns the filter copy/count mechanics. `TASK-213-03-03` owns the
broader sidebar/toolbar hierarchy and duplicate Favorites rail behavior from
`UX-5`/`UX-8`.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/widgets/registry.ts`
- `core/widgets/modulePackMatrix.ts` only if adding display labels to status
  metadata is the right owner
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/admin/widgetsClient.test.ts` only if catalog payload changes

## Implementation Direction

Separate internal readiness from display labels.

Pseudocode:

```ts
type WidgetModuleOption = {
  value: string;
  displayName: string;
  readiness: "ready" | "needs-coverage" | "untracked";
  displayStatus: "Ready to use" | "In preparation" | "Available";
};
```

Compute tab counts from the active filter basis:

```ts
const base = {
  query,
  activeScope: "widgets",
  widgetCategory,
  widgetModule,
  widgetComplexity,
};

recommendedCount = filter({ ...base, widgetTab: "recommended" }).length;
allCount = filter({ ...base, widgetTab: "all" }).length;
```

Advanced mode helper:

```tsx
<Tooltip content="Enable complexity filtering for composite and atomic widgets.">
  <Switch aria-label="Show advanced widget filters" ... />
</Tooltip>
```

If UI simplification is larger than this leaf, document the remaining IA
cleanup as a follow-up instead of silently redesigning the whole rail.

## Security Contract

- Visibility: internal admin Widget Library.
- Auth model: unchanged catalog/settings read path.
- RBAC: existing `widgets:read`.
- CSRF/rate-limit: no route write changes.
- Reject-unknown validation: module filter values continue to come from
  registered widget metadata; arbitrary values should not create new catalog
  states.
- Anti-abuse: do not surface raw pack validation errors or internal enforcement
  details in user-facing labels.

## Testing Requirements

- `tests/vitest/ui/widgetLibraryUtils.test.ts`
  - readiness metadata remains available;
  - display labels are user-facing;
  - tab counts respect category/module/complexity filters.
- `tests/vitest/ui/widget-library.test.tsx`
  - advanced mode helper is present;
  - complexity filter remains disabled until advanced mode is enabled.
- Manual Playwright:
  - select `Layout` and verify tab counts match visible list basis;
  - inspect module dropdown wording;
  - focus/hover Advanced mode and verify helper text.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS_COMPOSITE_STRATEGY.md` if the meaning of `Recommended`,
  `All widgets`, or `Advanced mode` changes
- `_docs/WIDGET_PACK_MATRIX.md`
- `docs/coderso/widget-library.md`

## Acceptance Criteria

1. Tab counts no longer contradict active filters.
2. Module readiness copy is understandable for editors.
3. Advanced mode has accessible helper copy.
4. Pack matrix status metadata remains available for validation.
