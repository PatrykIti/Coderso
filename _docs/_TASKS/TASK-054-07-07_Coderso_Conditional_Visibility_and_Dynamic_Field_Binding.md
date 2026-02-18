# TASK-054-07-07: Coderso Conditional Visibility and Dynamic Field Binding
# FileName: TASK-054-07-07_Coderso_Conditional_Visibility_and_Dynamic_Field_Binding.md

**Priority:** Medium  
**Category:** Runtime + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-06  
**Status:** Done (2026-02-18)

---

## Goal
Add conditions and field binding rules so listing items can show/hide blocks based on row data.

## Files to Change
- `core/services/content/listingRuntimeResolver.ts` (new)
- `core/services/content/listingTemplatesService.ts`
- `core/services/content/contentListResolver.ts`
- `core/widgets/core/contentList.tsx`
- `core/admin/ui/listings/ListingTemplateManager.tsx`
- `core/admin/ui/listings/components/BindingEditor.tsx` (new)
- `core/admin/services/listingsClient.ts`
- `tests/unit/content/listingRuntimeResolver.test.ts` (new)
- `tests/unit/content/listingTemplatesService.test.ts`
- `tests/unit/widgets/contentList.test.tsx`
- `tests/unit/ui/listing-binding-editor.test.tsx`

## Rules
- Allowed condition ops: `eq, neq, in, contains, exists, gt, gte, lt, lte`.
- Conditions evaluated only against resolved listing row fields.
- Missing fields fail safely (false unless `exists=false` logic applies).

## Pseudocode
```ts
function evaluateVisibility(conditions: ListingCondition[], row: ListingRow) {
  return conditions.every((condition) => evaluateCondition(condition, row));
}
```

## Acceptance Criteria
1. UI allows adding/removing/reordering conditions.
2. Runtime conditions are deterministic and safe.
3. Tests cover null/missing/array edge cases.

## Result
- Added `listingRuntimeResolver` with deterministic operators `eq, neq, in, contains, exists, gt, gte, lt, lte`, safe nested-path reads, and condition evaluation.
- Extended listing template field bindings with `conditions` in normalization/validation and admin client contracts.
- Wired runtime binding index into `contentList` listing row mapping so template-bound fields can be hidden by conditions without unsafe fallback leaks.
- Added admin `BindingEditor` and integrated it into Listings Template manager with add/remove/reorder for bindings and conditions.
- Updated runtime rendering to hide CTA when item has no resolved safe href.
