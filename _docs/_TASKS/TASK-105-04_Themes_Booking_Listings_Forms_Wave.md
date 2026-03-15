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
- direct `ListingListPage` coverage for loading hook states, load alerts, API and generic delete failures, and successful refresh after delete
- booking leaf follow-up coverage for empty/fallback states in `AvailabilityTab`, `ReservationsTab`, `ServicesTab`, and `SlotPreviewTab`
- direct `FormCanvas` DOM coverage for form and field selection, remove-action bubbling guards, multi-step normalization, and checkbox fallback copy
- deeper `ThemeTemplateDrawer` coverage for color text-input normalization without hash prefixes across base, typography, input, topbar, card, and state token fields
- booking leaf follow-up coverage for `ServicesTab` public-access fallback rows, no-price rendering, unchecked assignment state, and disabled save-assignment behavior
- direct interactive coverage for booking leaf tabs callback routing across `AvailabilityTab`, `ReservationsTab`, `ServicesTab`, and `SlotPreviewTab`
- deeper `ThemeTemplateDrawer` coverage for blank/invalid color text inputs, hash-preserving normalization, and additional invert fallback behavior

Current `2026-03-14` snapshot after the latest follow-up slice:
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `85.00%` lines / `70.21%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `92.61%` lines / `65.62%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `100.00%` lines / `81.81%` branches
- `core/admin/ui/forms/FormCanvas.tsx` -> `76.66%` lines / `73.21%` branches
- `core/admin/ui/forms/FormListPage.tsx` -> `90.32%` lines / `83.33%` branches
- aggregate `core/admin/ui/forms/*` average -> `89.24%` lines / `69.48%` branches across `13` tracked files

Current `2026-03-14` forms snapshot after the latest canvas follow-up:
- `core/admin/ui/forms/FormBuilderPage.tsx` -> `85.00%` lines / `70.21%` branches
- `core/admin/ui/forms/FormActionsPanel.tsx` -> `92.61%` lines / `65.62%` branches
- `core/admin/ui/forms/FormActionLogsPage.tsx` -> `100.00%` lines / `81.81%` branches
- `core/admin/ui/forms/FormCanvas.tsx` -> `100.00%` lines / `94.64%` branches
- `core/admin/ui/forms/FormListPage.tsx` -> `90.32%` lines / `83.33%` branches
- aggregate `core/admin/ui/forms/*` average -> `91.03%` lines / `71.13%` branches across `13` tracked files

Current `2026-03-14` listings snapshot after the latest follow-up slice:
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines / `73.72%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `94.02%` lines / `75.86%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines / `72.22%` branches
- `core/admin/ui/listings/ListingListPage.tsx` -> `69.23%` lines / `50.00%` branches
- aggregate `core/admin/ui/listings/*` average -> `88.67%` lines / `70.25%` branches across `10` tracked files

Current `2026-03-14` listings snapshot after the latest list-page follow-up:
- `core/admin/ui/listings/ListingEditorPage.tsx` -> `89.79%` lines / `73.72%` branches
- `core/admin/ui/listings/components/BindingEditor.tsx` -> `94.02%` lines / `75.86%` branches
- `core/admin/ui/listings/ListingTemplateManager.tsx` -> `86.20%` lines / `72.22%` branches
- `core/admin/ui/listings/ListingListPage.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/listings/*` average -> `91.74%` lines / `74.39%` branches across `10` tracked files

Current `2026-03-14` themes snapshot after the latest follow-up slice:
- `core/admin/ui/themes/ThemesPage.tsx` -> `94.06%` lines / `78.57%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `76.64%` lines / `74.35%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/themes/*` average -> `89.65%` lines / `78.22%` branches across `11` tracked files

Current `2026-03-14` themes snapshot after the latest template-drawer follow-up:
- `core/admin/ui/themes/ThemesPage.tsx` -> `94.06%` lines / `78.57%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `78.83%` lines / `76.92%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/themes/*` average -> `90.34%` lines / `78.59%` branches across `11` tracked files

Current `2026-03-15` themes snapshot after the latest drawer-normalization follow-up:
- `core/admin/ui/themes/ThemesPage.tsx` -> `94.06%` lines / `78.57%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `80.29%` lines / `82.05%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/themes/*` average -> `90.80%` lines / `79.33%` branches across `11` tracked files

Current `2026-03-15` themes snapshot after the latest navigation/input follow-up:
- `core/admin/ui/themes/ThemesPage.tsx` -> `94.06%` lines / `78.57%` branches
- `core/admin/ui/themes/ThemeProfileDrawer.tsx` -> `100.00%` lines / `94.59%` branches
- `core/admin/ui/themes/ThemeTemplateDrawer.tsx` -> `85.40%` lines / `84.61%` branches
- `core/admin/ui/themes/ThemeExportDialog.tsx` -> `100.00%` lines / `100.00%` branches
- aggregate `core/admin/ui/themes/*` average -> `91.26%` lines / `79.56%` branches across `11` tracked files

Current `2026-03-14` booking snapshot after the latest follow-up slice:
- `core/admin/ui/booking/BookingPage.tsx` -> `92.93%` lines / `65.06%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `98.27%` lines / `97.82%` branches
- `core/admin/ui/booking/components/AvailabilityTab.tsx` -> `35.29%` lines / `88.46%` branches
- `core/admin/ui/booking/components/ReservationsTab.tsx` -> `31.25%` lines / `100.00%` branches
- `core/admin/ui/booking/components/ServicesTab.tsx` -> `34.78%` lines / `83.33%` branches
- `core/admin/ui/booking/components/SlotPreviewTab.tsx` -> `44.44%` lines / `100.00%` branches
- aggregate `core/admin/ui/booking/*` average -> `93.86%` lines / `72.16%` branches across `8` tracked files

Current `2026-03-15` booking snapshot after the latest services-tab follow-up:
- `core/admin/ui/booking/BookingPage.tsx` -> `92.93%` lines / `65.06%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `98.27%` lines / `97.82%` branches
- `core/admin/ui/booking/components/AvailabilityTab.tsx` -> `35.29%` lines / `88.46%` branches
- `core/admin/ui/booking/components/ReservationsTab.tsx` -> `31.25%` lines / `100.00%` branches
- `core/admin/ui/booking/components/ServicesTab.tsx` -> `34.78%` lines / `97.22%` branches
- `core/admin/ui/booking/components/SlotPreviewTab.tsx` -> `44.44%` lines / `100.00%` branches
- aggregate `core/admin/ui/booking/*` average -> `93.86%` lines / `74.77%` branches across `8` tracked files

Current `2026-03-15` booking snapshot after the latest interactive leaf-tab follow-up:
- `core/admin/ui/booking/BookingPage.tsx` -> `92.93%` lines / `65.06%` branches
- `core/admin/ui/booking/bookingHelpers.ts` -> `98.27%` lines / `97.82%` branches
- `core/admin/ui/booking/components/AvailabilityTab.tsx` -> `100.00%` lines / `88.46%` branches
- `core/admin/ui/booking/components/ReservationsTab.tsx` -> `100.00%` lines / `100.00%` branches
- `core/admin/ui/booking/components/ServicesTab.tsx` -> `100.00%` lines / `97.22%` branches
- `core/admin/ui/booking/components/SlotPreviewTab.tsx` -> `100.00%` lines / `100.00%` branches
- booking leaf tabs are now line-closed; remaining booking work is branch-only or sits in the page shell rather than in the tab components

Remaining slices:
- booking leaf tabs no longer dominate the wave backlog; they are now line-closed, and the remaining `TASK-105-04` ROI is led by `ThemeTemplateDrawer` plus any broader booking/page-shell cleanup
- residual themes work is still concentrated in `ThemeTemplateDrawer`, but it now sits in the mid-80s for both lines and branches, so the remaining gains are narrower and more selective than before
- forms follow-up is no longer led by `FormCanvas`; the residual forms work is concentrated in branch-heavier `FormBuilderPage` paths
- listings follow-up is no longer led by `ListingListPage`; the residual listings work is now lower-value cleanup in `ListingEditorPage` / `ListingTemplateManager`

## Testing Requirements

- `bun run test:vitest`
- `bun run test:coverage`
