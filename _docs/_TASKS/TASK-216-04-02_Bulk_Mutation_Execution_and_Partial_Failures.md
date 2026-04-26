# TASK-216-04-02: Bulk Mutation Execution and Partial Failures
# FileName: TASK-216-04-02_Bulk_Mutation_Execution_and_Partial_Failures.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-216-04-01, TASK-216-03-02
**Status:** To Do

---

## Overview

Execute Commerce bulk lifecycle actions with existing product client helpers,
confirmed destructive flow, background refresh, and partial-failure feedback.

## Sub-Tasks

- [ ] Map bulk publish to `updateCommerceProduct(id, { status: "published" })`.
- [ ] Map bulk move-to-draft to
  `updateCommerceProduct(id, { status: "draft" })`.
- [ ] Map bulk archive to `updateCommerceProduct(id, { status: "archived" })`.
- [ ] Map bulk delete to `deleteCommerceProduct(id)` after
  `ConfirmActionDialog` confirmation.
- [ ] Use `Promise.allSettled` for all bulk actions.
- [ ] Refresh products with `{ force: true, background: true }` after
  mutations settle.
- [ ] Emit shared bulk summaries and keep failed products recoverable.
- [ ] Do not add a batch endpoint only for UI parity.

## Files to Change

- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/admin/ui/commerce/commerceActionToasts.ts`
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.
- `tests/vitest/admin/commerceClient.test.ts` if client behavior changes.

## Security Contract

- Visibility: internal admin UI and existing product API.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:write`.
- CSRF: `updateCommerceProduct` and `deleteCommerceProduct` keep
  `withCsrf: true`.
- Rate-limit bucket: existing `admin_write` per request.
- Reject-unknown validation: status patch payloads contain only allowed status
  values.
- Anti-abuse: bulk delete requires explicit confirmation; selected ids are
  visible-row derived; partial failure copy must not expose stack traces or raw
  payloads.

## Pseudocode

```ts
const runBulkAction = async (action: CommerceBulkActionValue, ids: string[]) => {
  const results = await Promise.allSettled(
    ids.map((id) => {
      if (action === "publish") return updateCommerceProduct(id, { status: "published" });
      if (action === "move-to-draft") return updateCommerceProduct(id, { status: "draft" });
      if (action === "archive") return updateCommerceProduct(id, { status: "archived" });
      return deleteCommerceProduct(id);
    })
  );
  await refreshProducts({ force: true, background: true });
  const summary = commerceProductToasts.summarizeBulkAction(action, ids, results);
  commerceProductToasts.emitBulk(summary);
};
```

## Testing Requirements

- Bulk publish/draft/archive call update client with the correct status only.
- Bulk delete opens confirmation before running delete requests.
- Success clears selection and emits success feedback.
- Partial failures show inline and toast copy and keep failed ids recoverable.
- Failed bulk action does not submit hidden ids.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CONTENT_LIST_UX.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Bulk lifecycle actions use existing product client helpers.
2. Bulk delete is confirmed.
3. Partial failures are visible and recoverable.
