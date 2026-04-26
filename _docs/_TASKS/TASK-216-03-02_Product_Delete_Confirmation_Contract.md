# TASK-216-03-02: Product Delete Confirmation Contract
# FileName: TASK-216-03-02_Product_Delete_Confirmation_Contract.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-216-03-01, TASK-208
**Status:** To Do

---

## Overview

Replace immediate row delete with a token-backed `ConfirmActionDialog` flow for
Commerce products.

## Sub-Tasks

- [ ] Track `pendingDeleteId` and `deletingId` in `CommerceListPage`.
- [ ] Open `ConfirmActionDialog` from row Delete.
- [ ] Show product-specific title and bounded description.
- [ ] Run `deleteCommerceProduct` only from `onConfirm`.
- [ ] Refresh products in the background after successful delete.
- [ ] Keep failed products visible and recoverable on delete failure.
- [ ] Route success/error copy through the base Commerce list toast adapter
  created or reused by the row lifecycle leaf. TASK-216-04-03 can extend that
  same owner for bulk summaries and route-error coverage.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/CommerceTable.tsx`
- `core/admin/ui/commerce/commerceActionToasts.ts` if not already present.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.
- `tests/vitest/admin/commerceClient.test.ts`

## Security Contract

- Visibility: internal Commerce admin UI and product delete API.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:write`.
- CSRF: `deleteCommerceProduct` continues to call the existing client with
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: delete uses path id only; no request body.
- Anti-abuse: delete requires explicit confirmation; dialog copy must not
  expose raw metadata, raw widget payloads, checkout adapter data, or secrets.

## Pseudocode

```tsx
<ConfirmActionDialog
  open={Boolean(pendingDeleteId)}
  onOpenChange={(open) => {
    if (!open) setPendingDeleteId(null);
  }}
  title="Delete product?"
  description={`Delete ${pendingProduct?.title ?? "this product"} from the catalog? This cannot be undone.`}
  confirmLabel="Delete product"
  confirmingLabel="Deleting..."
  isConfirming={deletingId === pendingDeleteId}
  onConfirm={() => pendingDeleteId ? runDelete(pendingDeleteId) : undefined}
/>
```

## Testing Requirements

- Clicking row Delete opens the dialog and does not call the API.
- Cancel closes the dialog without mutation.
- Confirm calls `deleteCommerceProduct` once.
- Successful delete refreshes products, clears pending state, and emits success
  feedback.
- Failed delete leaves the product visible and emits bounded error feedback.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` on closure.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Row delete is impossible without confirmation.
2. Delete success and failure feedback uses the shared Commerce list copy.
3. Failed deletes remain recoverable.
