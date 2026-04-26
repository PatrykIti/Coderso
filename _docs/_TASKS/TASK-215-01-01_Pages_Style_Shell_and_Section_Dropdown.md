# TASK-215-01-01: Pages-Style Shell and Section Dropdown
# FileName: TASK-215-01-01_Pages_Style_Shell_and_Section_Dropdown.md

**Priority:** High
**Category:** Coderso Widgets + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-215-01
**Status:** Done (2026-04-26)

---

## Overview

Replace the current Widget Library left rail with a compact section dropdown in
the filter/action bar. The visual structure should follow the Pages list
surface: header, filter/action row, result area, and shared empty/loading/error
states.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/WidgetLibraryPage.tsx`
- `core/admin/ui/widgets/WidgetLibrarySectionSelect.tsx` if extracted.
- `tests/vitest/ui/widget-library.test.tsx`

## Security Contract

- Visibility: internal admin UI only.
- Auth model: unchanged authenticated admin session/admin API key path.
- RBAC: unchanged `widgets:read`.
- CSRF: no writes.
- Rate-limit bucket: unchanged `admin_read`.
- Reject-unknown validation: section values are local closed enum values.
- Anti-abuse: invalid persisted or URL-derived section values, if introduced,
  must normalize to `all-items`.

## Pseudocode

```tsx
const sectionOptions = [
  { value: "all-items", label: "All Items" },
  { value: "favorites", label: "Favorites" },
  { value: "templates", label: "Templates" },
  { value: "widgets-all", label: "All Widgets" },
  { value: "layout", label: "Layout" },
  { value: "content", label: "Content" },
  { value: "forms", label: "Forms" },
  { value: "navigation", label: "Navigation" },
  { value: "media", label: "Media" },
];
```

## Testing Requirements

- `All Items` is selected by default.
- Each old rail choice appears in the dropdown.
- The previous left rail labels are not duplicated as a full sidebar.
- The filter/action bar stays above the result area.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/widget-library.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Section selection happens through one dropdown in the filter bar.
2. The page no longer depends on the left panel for library navigation.
3. The new shell remains consistent with existing Pages list density.
