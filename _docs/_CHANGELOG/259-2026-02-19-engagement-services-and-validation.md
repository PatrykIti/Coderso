# 259 - Engagement Services and Validation

- **Date:** 2026-02-19
- **Version:** 0.1.259
- **Tasks:** TASK-054-12, TASK-054-12-02

## Key Changes

### Popup Domain Services
- Added popup domain contract and validation helpers:
  - status/slug/name normalization,
  - trigger/targeting/frequency/content/settings normalization.
- Added popup service lifecycle:
  - list/get/create/update/delete,
  - status transition helper with publish timestamp behavior.
- Files:
  - `core/services/popups/popupTypes.ts`
  - `core/services/popups/popupValidation.ts`
  - `core/services/popups/popupService.ts`

### Reviews Domain Services
- Added reviews domain contract and validation helpers:
  - status/entity/rating/author normalization.
- Added review service lifecycle:
  - list/get/create/update/delete,
  - moderation status transition helper (`moderatedAt` + `publishedAt` behavior).
- Files:
  - `core/services/reviews/reviewTypes.ts`
  - `core/services/reviews/reviewValidation.ts`
  - `core/services/reviews/reviewService.ts`

### Mega Menu Metadata Normalization
- Extended menu item normalization pipeline to safely persist metadata settings.
- Updated menu schema/client contracts to support `settings` payload.
- Files:
  - `core/services/menus/menuService.ts`
  - `core/services/menus/treeBuilder.ts`
  - `core/server/validation/menuSchemas.ts`
  - `core/admin/services/menusClient.ts`

### Tests
- Added validation and service coverage for engagement domain:
  - `tests/unit/engagement/popupValidation.test.ts`
  - `tests/unit/engagement/reviewValidation.test.ts`
  - `tests/unit/engagement/popupService.test.ts`
  - `tests/unit/engagement/reviewService.test.ts`
