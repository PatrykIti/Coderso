# TASK-216-05-01: Commerce Parity Test Matrix
# FileName: TASK-216-05-01_Commerce_Parity_Test_Matrix.md

**Priority:** Medium
**Category:** Coderso Commerce + QA
**Estimated Effort:** Small
**Dependencies:** TASK-216-04
**Status:** To Do

---

## Overview

Map every TASK-216 behavior to the correct repo test lane before closure.

## Sub-Tasks

- [ ] UI orchestration: cache hydration, filters, selection, pagination, row
  actions, confirmations, bulk actions, toasts, and inline errors.
- [ ] Admin client/cache: CSRF writes, cache priming, cache-bus broadcasts, and
  cached product/collection reads.
- [ ] Navigation/prefetch: `/commerce` alias and `/coderso/commerce` prefetch.
- [ ] Route/error mapping: stable Commerce product/query errors where changed.
- [ ] Runtime compatibility: Commerce widgets/runtime resolver if product
  status/query semantics change.
- [ ] Manual/Playwright smoke: list parity flows against the running admin UI.

## Files to Change

- `tests/vitest/ui/commerce-page.test.tsx`
- `tests/vitest/ui/commerce-list-page-wave.test.tsx` if added.
- `tests/vitest/admin/commerceClient.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/vitest/admin/adminPaths.test.ts`
- `tests/vitest/admin/cacheRefresh.test.ts`
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/ui/list-pagination.test.tsx`
- `tests/integration/routes/commerceRoutes.test.ts` if route mapping changes.
- `tests/unit/commerce/commerceRuntimeResolver.test.ts` if runtime behavior is
  touched.
- `tests/unit/commerce/commerceWidgetRuntime.test.ts` if runtime behavior is
  touched.
- `_docs/_TASKS/TASK-216*.md`

## Security Contract

- Visibility: validation planning only.
- Auth model: no new behavior.
- RBAC/CSRF/rate-limit: test matrix must include existing auth/write guarantees
  when touched.
- Reject-unknown validation: validation schema changes require dedicated schema
  proof.
- Anti-abuse: destructive confirmation and visible-id selection must be covered.

## Testing Requirements

- Baseline commands:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx tests/vitest/admin/commerceClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/adminPaths.test.ts`
- Add the focused Commerce wave suite if current static render tests cannot
  prove mounted cache events, dialogs, bulk actions, or toasts.
- DB-backed Bun route tests when route mapping changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/commerceRoutes.test.ts`
- Runtime compatibility when status/query behavior changes:
  - `bun test tests/unit/commerce/commerceRuntimeResolver.test.ts tests/unit/commerce/commerceWidgetRuntime.test.ts`
- Manual/Playwright smoke:
  - cache-present mount;
  - all filters;
  - select visible products;
  - row publish/draft/archive/delete;
  - confirmed bulk delete;
  - partial-failure behavior if feasible through mocked tests.

## Documentation Updates Required

- `_docs/_TASKS/TASK-216*.md`
- `_docs/PLAYWRIGHT/SUMMARY-COMMERCE.md` or linked manual QA notes on closure.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Every TASK-216 behavior has an owner suite.
2. Runtime/Bun lanes are used only for runtime or route contracts.
3. The final evidence distinguishes targeted proof from broad gate blockers.
