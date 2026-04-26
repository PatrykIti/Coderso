# TASK-213-03-03: Widget Filter Hierarchy and Favorites Rail Simplification
# FileName: TASK-213-03-03_Widget_Filter_Hierarchy_and_Favorites_Rail_Simplification.md

**Priority:** Medium
**Category:** Widget Library + IA + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-213-03, TASK-213-03-01, TASK-213-03-02
**Status:** To Do

---

## Overview

Fix `UX-5` and `UX-8` from the Widget Library report.

The current library shows several filtering axes at once: sidebar scope,
sidebar widget categories, `Recommended`/`All widgets`, `Advanced mode`, module,
complexity, search, and a second Favorites list near the `Favorites` count.
Editors need one clear hierarchy instead of duplicate controls that appear to
compete with each other.

The business outcome is a library where a beginner can answer "where am I?" and
"what is filtering this list?" without understanding widget pack internals. The
technical outcome is a smaller state model inside the existing
`WidgetLibraryPage`/`WidgetCatalogFilters` seam, not a new library surface.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/ui/widgets/types.ts` only if filter state metadata needs a typed
  view model
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/pageBuilder/widgetLibrary.test.tsx` only if shared library
  filtering behavior changes

## Implementation Direction

Keep the existing page shell and route. Clarify ownership of each control:

1. Sidebar owns high-level scope and widget category selection.
2. Toolbar owns search, `Recommended`/`All widgets`, module, Advanced mode, and
   complexity filters for the active Widgets scope.
3. Favorites are represented in one place per rail state.

Default implementation:

- keep the `Favorites` scope row with its count;
- remove the lower duplicate Favorites shortcut list from the rail;
- show favorite widgets in the main list when the `Favorites` scope is active;
- keep category buttons visible only as widget-category filters, not as a
  second competing scope when Templates/Favorites is active.

If product chooses to keep a favorites shortcut list, it must replace the
`Favorites` scope row rather than coexist beside it.

Pseudocode:

```ts
type LibraryScope = "widgets" | "templates" | "favorites" | "all-items";

const sidebarModel = {
  scopes: buildPrimaryScopes(scopeCounts),
  widgetCategories:
    activeScope === "widgets" ? buildWidgetCategoryFilters(categoryCounts) : [],
  favoriteShortcuts: [], // avoid duplicate Favorites row + list in the rail
};

const visibleItems = filterWidgetLibraryItems(widgets, {
  activeScope,
  widgetCategory: activeScope === "widgets" ? widgetCategory : "all",
  widgetTab,
  widgetModule,
  widgetComplexity,
  query,
});
```

Filter reset rules should be explicit:

```ts
function selectScope(scope: LibraryScope) {
  setActiveScope(scope);
  if (scope !== "widgets") {
    setWidgetCategory("all");
  }
}
```

Do not redesign the full AdminShell, add a second route, or hide pack-readiness
data. This leaf only clarifies the current Widget Library hierarchy.

## Security Contract

- Visibility: internal admin Widget Library only.
- Auth model: unchanged admin session/API-key path.
- RBAC: existing `widgets:read` and user-settings permissions.
- CSRF/rate-limit: no route write changes; favorite writes keep the existing
  settings client behavior from `TASK-213-03-01`.
- Reject-unknown validation: filter values continue to come from registered
  widget metadata and typed local state; arbitrary strings must not create new
  catalog states.
- Anti-abuse: UI copy must not expose raw pack validation errors, settings
  payloads, private catalog data, auth headers, or stack traces.

## Testing Requirements

- `tests/vitest/ui/widget-library.test.tsx`
  - the rail does not render both a `Favorites` scope row and a nearby duplicate
    favorites shortcut list;
  - switching to Templates/Favorites clears or ignores widget-category state
    without surprising counts;
  - switching back to Widgets preserves predictable category/module/filter
    behavior.
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
  - filtering logic remains deterministic across scope/category/module/tab
    combinations.
- Manual Playwright:
  - navigate Widgets -> Layout -> Templates -> Favorites -> Widgets and verify
    the count, tab, and visible item states are understandable;
  - verify favorites are discoverable without duplicate rail signals.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `docs/coderso/widget-library.md` if the sidebar/filter model is documented.

## Acceptance Criteria

1. Favorites are not duplicated in two nearby rail locations.
2. Sidebar and toolbar controls have a clear owner and predictable reset rules.
3. Existing category/module/recommended/complexity filtering remains available.
4. Tests cover the scope/category/filter interactions and duplicate Favorites
   regression.
