# TASK-054-07-07: Coderso Conditional Visibility and Dynamic Field Binding
# FileName: TASK-054-07-07_Coderso_Conditional_Visibility_and_Dynamic_Field_Binding.md

**Priority:** Medium  
**Category:** Runtime + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-054-07-06  
**Status:** To Do

---

## Goal
Add conditions and field binding rules so listing items can show/hide blocks based on row data.

## Files to Change
- `core/services/content/listingRuntimeResolver.ts` (new)
- `core/widgets/core/contentList.tsx`
- `core/admin/ui/listings/components/BindingEditor.tsx` (new)
- `tests/unit/content/listingRuntimeResolver.test.ts` (new)

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
