# TASK-054-12-02: Popup and Reviews Services and Validation
# FileName: TASK-054-12-02_Popup_and_Reviews_Services_and_Validation.md

**Priority:** High  
**Category:** Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-12-01  
**Status:** Done (2026-02-19)

---

## Goal
Implement domain services and normalization for popups/reviews with deterministic moderation and publishing behavior.

## Scope
1. Popup service CRUD + publish/unpublish lifecycle.
2. Reviews service CRUD + moderation state transitions.
3. Validation helpers for trigger/targeting/frequency payloads.
4. Menu metadata normalization helper for mega-menu settings.

## Files
- `core/services/popups/popupService.ts` (new)
- `core/services/popups/popupTypes.ts` (new)
- `core/services/popups/popupValidation.ts` (new)
- `core/services/reviews/reviewService.ts` (new)
- `core/services/reviews/reviewTypes.ts` (new)
- `core/services/reviews/reviewValidation.ts` (new)
- `core/services/menus/menuService.ts` (normalize metadata)

## Pseudocode
```ts
if (status === "approved" && !publishedAt) publishedAt = now;
if (status !== "approved") publishedAt = null;
```

## Acceptance Criteria
1. Services enforce deterministic status transitions and input normalization.
2. Invalid trigger/review payloads return stable domain errors.
3. Unit tests cover lifecycle and validation edge cases.

## Delivered
- Added popup domain contract/services:
  - `core/services/popups/popupTypes.ts`
  - `core/services/popups/popupValidation.ts`
  - `core/services/popups/popupService.ts`
- Added review domain contract/services:
  - `core/services/reviews/reviewTypes.ts`
  - `core/services/reviews/reviewValidation.ts`
  - `core/services/reviews/reviewService.ts`
- Added mega-menu metadata normalization in menu domain:
  - `core/services/menus/menuService.ts`
  - `core/services/menus/treeBuilder.ts`
  - `core/server/validation/menuSchemas.ts`
  - `core/admin/services/menusClient.ts`
- Added tests:
  - `tests/unit/engagement/popupValidation.test.ts`
  - `tests/unit/engagement/reviewValidation.test.ts`
  - `tests/unit/engagement/popupService.test.ts`
  - `tests/unit/engagement/reviewService.test.ts`
