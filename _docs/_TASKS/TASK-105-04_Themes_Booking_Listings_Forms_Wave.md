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
- booking follow-up branches for delete-service/delete-blackout errors and reservation validation on missing customer name plus reversed time ranges
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
- direct close-path coverage for `ThemeExportDialog`
- direct `FormListPage` coverage for create success, refresh fallback, load failure, and delete error paths
- direct `ListingListPage` coverage for cached empty state and tab shell rendering
- booking leaf follow-up coverage for empty/fallback states in `AvailabilityTab`, `ReservationsTab`, `ServicesTab`, and `SlotPreviewTab`

Current `2026-03-14` snapshot after the latest follow-up slice:
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `85.00%` lines / `70.21%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `92.61%` lines / `65.62%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `100.00%` lines / `81.81%` branches
- `core/admin/ui/forms/FormCanvas.tsx` -> `76.66%` lines / `73.21%` branches
- `core/admin/ui/forms/FormListPage.tsx` -> `90.32%` lines / `83.33%` branches
- aggregate `core/admin/ui/forms/*` average -> `89.24%` lines / `69.48%` branches across `13` tracked files

Current `2026-03-14` listings snapshot after the latest follow-up slice:
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines / `73.72%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `94.02%` lines / `75.86%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines / `72.22%` branches
- `core/admin/ui/listings/ListingListPage.tsx` -> `69.23%` lines / `50.00%` branches
- aggregate `core/admin/ui/listings/*` average -> `88.67%` lines / `70.25%` branches across `10` tracked files

Current `2026-03-14` themes snapshot after the latest follow-up slice:
- `core/admin/ui/themes/ThemesPage.tsx` -> `94.06%` lines / `78.57%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `76.64%` lines / `74.35%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/themes/*` average -> `89.65%` lines / `78.22%` branches across `11` tracked files

Current `2026-03-14` booking snapshot after the latest follow-up slice:
- `core/admin/ui/booking/BookingPage.tsx` -> `92.93%` lines / `65.06%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `98.27%` lines / `97.82%` branches
- `core/admin/ui/booking/components/AvailabilityTab.tsx` -> `35.29%` lines / `88.46%` branches
- `core/admin/ui/booking/components/ReservationsTab.tsx` -> `31.25%` lines / `100.00%` branches
- `core/admin/ui/booking/components/ServicesTab.tsx` -> `34.78%` lines / `83.33%` branches
- `core/admin/ui/booking/components/SlotPreviewTab.tsx` -> `44.44%` lines / `100.00%` branches
- aggregate `core/admin/ui/booking/*` average -> `93.86%` lines / `72.16%` branches across `8` tracked files

Remaining slices:
- booking leaf tabs now dominate the remaining wave backlog, especially `AvailabilityTab`, `ReservationsTab`, `ServicesTab`, and `SlotPreviewTab`
- residual themes work is now concentrated in `ThemeTemplateDrawer`
- forms follow-up should focus on `FormCanvas` and the remaining branch-heavy `FormBuilderPage` paths
- listings follow-up should focus on `ListingListPage` plus residual lower-value cleanup in `ListingEditorPage` / `ListingTemplateManager`

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
