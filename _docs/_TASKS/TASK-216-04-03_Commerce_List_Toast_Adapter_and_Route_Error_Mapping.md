# TASK-216-04-03: Commerce List Toast Adapter and Route Error Mapping
# FileName: TASK-216-04-03_Commerce_List_Toast_Adapter_and_Route_Error_Mapping.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Error Handling + API Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-216-04, TASK-208, TASK-054-11-04
**Status:** To Do

---

## Overview

Create one Commerce list action feedback owner and tighten route mapping
coverage for UI-visible Commerce product errors.

## Sub-Tasks

- [ ] Add `core/admin/ui/commerce/commerceActionToasts.ts` or another
  Commerce-owned adapter module.
- [ ] Build on `createListActionToastAdapter`.
- [ ] Cover actions: create if list feedback touches create, publish,
  move-to-draft, archive, delete, and bulk delete/lifecycle summaries.
- [ ] Use bounded fallback messages for unknown failures.
- [ ] Keep raw API errors out of UI copy when they expose internals.
- [ ] Extend `mapCommerceError` tests for list-visible product errors if
  existing coverage is too shallow.
- [ ] Do not weaken `commerceSchemas.ts` strict schemas.

## Files to Change

- `core/admin/ui/commerce/commerceActionToasts.ts` if extracted.
- `core/admin/ui/commerce/CommerceListPage.tsx`
- `core/server/routes/commerceRoutes.ts` only if mapper behavior changes.
- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/integration/routes/commerceRoutes.test.ts` if route mapping changes or
  needs expanded coverage.
- `tests/vitest/validation/commerceSchemas.test.ts` if schemas change.

## Security Contract

- Visibility: internal Commerce admin UI and existing internal Commerce API.
- Auth model: unchanged.
- RBAC: unchanged per action.
- CSRF: unchanged per mutating client.
- Rate-limit buckets: unchanged.
- Reject-unknown validation: schema strictness stays owned by
  `commerceSchemas.ts`; route mapping must not accept unknown fields.
- Anti-abuse: toast and inline error copy must be bounded and must not include
  stack traces, raw payloads, secrets, preview tokens, checkout adapter data, or
  privileged settings.

## Pseudocode

```ts
export const commerceProductToasts = createListActionToastAdapter({
  labels: { singular: "product", plural: "products" },
  actions: {
    publish: { pastTense: "published", failureVerb: "publish" },
    "move-to-draft": { pastTense: "moved to draft", failureVerb: "move to draft" },
    archive: { pastTense: "archived", failureVerb: "archive" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});
```

## Testing Requirements

- Product lifecycle and delete success messages come from one Commerce helper.
- Unknown lifecycle/delete failures use bounded fallback copy.
- Known product errors map to stable API errors/statuses:
  `commerce_product_not_found`, `commerce_product_slug_exists`, generic
  `commerce_*` invalid payloads, and `commerce_query_*` errors.
- Route mapper tests still prove unknown errors return `null`.
- Schema tests still prove strict unknown-field rejection if schemas change.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/ui/list-action-toasts.test.ts`
  - Add or extend `tests/vitest/ui/commerce-list-page-wave.test.tsx`
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/commerceRoutes.test.ts` if route mapping changes.
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/validation/commerceSchemas.test.ts` if schemas change.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `docs/coderso/commerce-catalog.md`
- `_docs/CMS_API.md` if route error behavior changes.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce list action feedback has one owner.
2. UI-visible known Commerce errors are stable and covered.
3. Strict Commerce route schemas remain intact.
