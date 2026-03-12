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
- shell-level booking flows for `BookingPage`
- booking follow-up branches for cancel handlers, reservation-status errors, empty slot preview success state, and direct `bookingHelpers.ts` coverage
- commerce leaf panels and small editor sections
- form leaf: `FormCanvas`
- forms support panels and list/create flow
- direct builder shell, automation, and action-log coverage for `FormBuilderPage`, `FormActionsPanel`, and `FormActionLogsPage`
- forms builder/actions/logs follow-up branches for missing-form guards, generic load/retry errors, mobile field sheet callbacks, action relabel/reorder, fallback labels, and entry-mapping removal
- listings hooks, list/search/filter flows, deeper `ListingTemplateManager` branches, direct `ListingEditorPage` coverage, and direct `BindingEditor` coverage
- listings follow-up branches for query-not-found/generic preview editor states and binding condition reordering plus blank fallback clearing
- direct create/edit/save/invert coverage for `ThemeTemplateDrawer`
- interactive page-level coverage for `ThemesPage`
- direct create/edit/no-template coverage for `ThemeProfileDrawer`
- themes follow-up branches for first-profile auto-activation, template/profile save failures, and remaining topbar/card/state token editing paths in `ThemeTemplateDrawer`

Current `2026-03-08` forms snapshot after the latest slice:
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `81.25%` lines / `65.95%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `87.24%` lines / `63.12%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `96.42%` lines / `77.27%` branches
- aggregate `core/admin/ui/forms/*` average -> `86.06%` lines / `66.93%` branches across `13` tracked files

Current `2026-03-08` listings snapshot after the latest slice:
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines / `72.99%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `91.04%` lines / `74.13%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines / `72.22%` branches
- aggregate `core/admin/ui/listings/*` average -> `87.53%` lines / `65.00%` branches across `10` tracked files

Current `2026-03-08` themes snapshot after the latest slice:
- `core/admin/ui/themes/ThemesPage.tsx` -> `90.67%` lines / `75.71%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `72.99%` lines / `74.35%` branches
- aggregate `core/admin/ui/themes/*` average -> `90.78%` lines / `73.47%` branches across `11` tracked files

Current `2026-03-08` booking snapshot after the latest slice:
- `core/admin/ui/booking/BookingPage.tsx` -> `90.11%` lines / `63.25%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `84.48%` lines / `67.39%` branches
- aggregate `core/admin/ui/booking/*` average -> `65.04%` lines / `77.41%` branches across `8` tracked files

Remaining slices:
- remaining list/runtime-preview/list-page branches beyond the current builder/actions slice
- any residual `ThemeTemplateDrawer` branches plus broader non-wave backlog after `TASK-105-04`
- residual booking helper/page branches beyond the current shell slice

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
