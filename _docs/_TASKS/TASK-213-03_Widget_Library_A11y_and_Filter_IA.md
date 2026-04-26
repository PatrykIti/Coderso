# TASK-213-03: Widget Library A11y and Filter IA
# FileName: TASK-213-03_Widget_Library_A11y_and_Filter_IA.md

**Priority:** High
**Category:** Widget Library + Accessibility + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-213, TASK-054-25, TASK-054-16-03
**Status:** To Do

---

## Overview

Repair the Widget Library accessibility and filter hierarchy findings:

- favorite buttons need names, pressed state, visible state, and feedback;
- grid/list view toggles need labels and actual pressed state;
- `Advanced mode` needs a tooltip/helper explaining that it unlocks complexity
  filtering;
- module readiness copy should be user-facing instead of `Needs coverage`;
- `Recommended` and `All widgets` tab counts should reflect active category and
  filter context, or clearly document that they are global counts;
- the left rail should stop duplicating the same Favorites signal in two nearby
  locations;
- the sidebar and toolbar should have a clear hierarchy so categories, modules,
  Recommended/All, Advanced mode, and complexity filters do not compete as
  unrelated controls.

The business outcome is a scannable library that remains accessible for keyboard
and screen-reader users and does not make editors reason about implementation
terms.

## Sub-Tasks

- `TASK-213-03-01_Favorites_and_View_Toggle_A11y_Feedback.md`
- `TASK-213-03-02_Advanced_Mode_Module_Readiness_and_Tab_Counts.md`
- `TASK-213-03-03_Widget_Filter_Hierarchy_and_Favorites_Rail_Simplification.md`

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetCard.tsx`
- `core/admin/ui/widgets/WidgetCatalogFilters.tsx`
- `core/admin/ui/widgets/widgetLibraryUtils.ts`
- `core/admin/ui/widgets/types.ts` if richer module option metadata is passed
  to UI
- `core/widgets/registry.ts`
- `core/widgets/modulePackMatrix.ts` only if pack status labels need additional
  display metadata
- `tests/vitest/ui/widget-library.test.tsx`
- `tests/vitest/ui/widget-card.test.tsx`
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
- `tests/vitest/pageBuilder/widgetLibrary.test.tsx`

## Implementation Direction

Keep pack-readiness data intact, but separate internal status from UI copy.

Pseudocode:

```ts
const moduleStatusCopy = {
  ready: "Ready to use",
  "needs-coverage": "In preparation",
  untracked: "Available",
};

<SelectItem value={option.value}>
  <span>{option.displayName}</span>
  <Badge>{moduleStatusCopy[option.readiness]}</Badge>
</SelectItem>
```

Tab counts should be computed from the same filtered basis as the grid except
for the tab itself:

```ts
const tabCountBase = {
  query,
  activeScope: "widgets",
  widgetCategory,
  widgetModule,
  widgetComplexity,
};

recommendedCount = count({ ...tabCountBase, widgetTab: "recommended" });
allCount = count({ ...tabCountBase, widgetTab: "all" });
```

Favorite state:

```tsx
<Button
  aria-label={isFavorite ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
  aria-pressed={isFavorite}
  title={...}
>
```

## Security Contract

- Visibility: internal admin Widget Library only.
- Auth model: unchanged admin session/API-key path for settings/catalog reads.
- RBAC: existing `widgets:read` and user-settings permissions.
- CSRF: favorite setting writes keep existing admin write behavior.
- Rate-limit bucket: existing admin read/write bucket.
- Reject-unknown validation: no new persisted fields except existing
  `widgets.favorites` array; any new preference must be validated in the
  settings owner before use.
- Anti-abuse: UI labels and tooltips must not expose pack internals beyond
  bounded readiness copy and must not include raw validation errors.

## Testing Requirements

- `tests/vitest/ui/widget-card.test.tsx`
  - favorite button has dynamic `aria-label`, `aria-pressed`, and visible state.
- `tests/vitest/ui/widget-library.test.tsx`
  - view toggles have labels and selected state;
  - favorites rail does not duplicate confusing information;
  - sidebar scope, widget categories, and toolbar filters remain predictable
    after switching between Widgets, Templates, and Favorites;
  - advanced mode helper is rendered/accessibly described.
- `tests/vitest/ui/widgetLibraryUtils.test.ts`
  - module options preserve readiness metadata while UI labels are user-facing;
  - tab counts respect active category/module/complexity filters.
- Manual Playwright:
  - hover/focus favorite and view toggles;
  - select `Layout` and verify tab counts match the visible grid basis;
  - inspect module dropdown copy for non-technical wording.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGET_PACK_MATRIX.md` if readiness copy contract changes
- `docs/coderso/widget-library.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Favorite and view-toggle controls are named, stateful, and keyboard-friendly.
2. Advanced mode explains what changes when enabled.
3. Module readiness copy is user-facing while retaining pack status metadata.
4. Tab counts no longer conflict with the active category/filter context.
5. Favorites and filter hierarchy are not duplicated across nearby rail/toolbar
   controls.
