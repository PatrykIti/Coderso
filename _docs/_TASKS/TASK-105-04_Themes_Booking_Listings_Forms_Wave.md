# TASK-105-04: Themes, Booking, Listings, and Forms Wave
# FileName: TASK-105-04_Themes_Booking_Listings_Forms_Wave.md

**Priority:** High  
**Category:** QA + Admin/UI  
**Estimated Effort:** Large  
**Dependencies:** TASK-105-01  
**Status:** In Progress (2026-03-06)

---

## Overview

Attack the biggest medium-coverage product surfaces with real user-path tests.

## Priority Clusters

- `core/admin/ui/themes/*`
- `core/admin/ui/booking/*`
- `core/admin/ui/listings/*`
- `core/admin/ui/forms/*`

## Coverage Strategy

- theme route editor flows
- booking tabs and helpers
- listing editor/manager edge states
- form builder panels and drawers

## Pseudocode

```ts
renderPageWithMinimalCache();
renderPageWithCachedData();
renderErrorOrEmptyState();
assertProductSpecificControls();
```

## Acceptance Criteria

1. Each cluster gets meaningful state coverage, not just shell rendering.
2. Coverage increases across the largest medium-coverage admin modules.

## Progress Notes

Completed slices:
- theme leaf cards and `ThemeEditorPage`
- booking tabs: `Availability`, `Services`, `Reservations`, `SlotPreview`
- booking resource tab coverage
- commerce leaf panels and small editor sections
- form leaf: `FormCanvas`
- forms support panels and list/create flow
- listings hooks, list/search/filter flows, and template manager

Remaining slices:
- deeper listing editor flow and manager branches
- deeper forms builder shell and remaining page/panel branches beyond the current wave
- broader theme drawers and `ThemesPage`

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
