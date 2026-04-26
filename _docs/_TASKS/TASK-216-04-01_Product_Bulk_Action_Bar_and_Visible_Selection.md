# TASK-216-04-01: Product Bulk Action Bar and Visible Selection
# FileName: TASK-216-04-01_Product_Bulk_Action_Bar_and_Visible_Selection.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI
**Estimated Effort:** Medium
**Dependencies:** TASK-216-02-03
**Status:** To Do

---

## Overview

Add a Commerce-specific bulk action bar that appears inline in the `PageHeader`
when products are selected and limits operations to visible selected products.

## Sub-Tasks

- [ ] Add `CommerceBulkActionsBar` or a resource wrapper over the Pages bulk
  action pattern.
- [ ] Supported actions: Publish, Move to draft, Archive, Delete.
- [ ] Render inline beside compact `New` when `selectedIds.length > 0`.
- [ ] Clear selection and bulk action from the bar.
- [ ] Keep selected ids derived from visible rows only.
- [ ] Do not add bulk duplicate, bulk collection assignment, bulk media, or
  checkout/storefront operations.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/CommerceBulkActionsBar.tsx` if extracted.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.

## Security Contract

- Visibility: internal admin UI.
- Auth model: unchanged.
- RBAC: action execution requires `commerce:write`; rendering requires
  `commerce:read`.
- CSRF: no writes until TASK-216-04-02 executes selected actions.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: action value is a closed UI enum.
- Anti-abuse: selected product ids must come from visible normalized rows, not
  arbitrary form input.

## Pseudocode

```tsx
export type CommerceBulkActionValue =
  | "publish"
  | "move-to-draft"
  | "archive"
  | "delete";
```

## Testing Requirements

- Bulk bar appears only with selected products.
- Action select contains only supported Commerce lifecycle actions.
- Apply is disabled with no action.
- Clear removes selection and active action.
- Hidden rows cannot be selected through the bulk bar.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce has a Pages-style inline bulk action bar.
2. Bulk action choices match Commerce lifecycle only.
3. Selection remains visible-scope bounded.
