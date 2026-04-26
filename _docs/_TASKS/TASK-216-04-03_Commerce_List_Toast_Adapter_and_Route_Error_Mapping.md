# TASK-216-04-03: Commerce List Toast Adapter and Route Error Mapping
# FileName: TASK-216-04-03_Commerce_List_Toast_Adapter_and_Route_Error_Mapping.md

**Priority:** High
**Category:** Coderso Commerce + Admin/UI + Error Handling + API Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-216-04, TASK-208, TASK-054-11-04
**Status:** Done (2026-04-26)

---

## Overview

Create or extend one Commerce list action feedback owner and tighten route
mapping coverage for UI-visible Commerce product errors.

## Sub-Tasks

- [x] Reuse or add `core/admin/ui/commerce/commerceActionToasts.ts` or another
  Commerce-owned adapter module. If TASK-216-03 already introduced the base
  row lifecycle/delete adapter, extend it here instead of creating a second
  feedback owner.
- [x] Build on `createListActionToastAdapter`.
- [x] Cover actions: create if list feedback touches create, publish,
  move-to-draft, archive, delete, and bulk delete/lifecycle summaries.
- [x] Use bounded fallback messages for unknown failures.
- [x] Keep raw API errors out of UI copy when they expose internals.
- [x] Extend `mapCommerceError` tests for list-visible product errors if
  existing coverage is too shallow.
- [x] Do not weaken `commerceSchemas.ts` strict schemas.

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

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
