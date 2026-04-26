# TASK-214-05-01: Listings Parity Test Matrix
# FileName: TASK-214-05-01_Listings_Parity_Test_Matrix.md

**Priority:** Medium
**Category:** QA
**Estimated Effort:** Small
**Dependencies:** TASK-214-01, TASK-214-02, TASK-214-03, TASK-214-04
**Status:** To Do

---

## Overview

Create and run the focused automated test matrix for Listings tabbed list
parity.

The existing `listing-list-page-wave.test.tsx` mocks important children, so it
can prove parent orchestration but not every real table/dialog detail. Name and
add real component suites where the mocked wave cannot prove behavior.

## Sub-Tasks

- [ ] Map each TASK-214 behavior to an owning test file.
- [ ] Separate parent orchestration tests from real table/dialog tests.
- [ ] Cover active-tab `New` behavior for both tabs.
- [ ] Cover query and template filter helpers.
- [ ] Cover row and bulk delete confirmation timing.
- [ ] Cover query/template toast copy and partial failure summaries.
- [ ] Cover that query/template toast copy comes from
  `core/admin/ui/listings/listingActionToasts.ts`, not duplicated local
  adapters in the list shell, template manager, or query editor.
- [ ] Cover cache hydration and prefetch warmup.
- [ ] Extend `tests/vitest/admin/listingsClient.test.ts` beyond its current
  public-search smoke coverage when client wrappers change, including query and
  template mutation `withCsrf: true`, cache priming, detail-cache writes, and
  cache-bus broadcasts.
- [ ] Cover the controlled template boundary: header `New`, row Edit, dialog
  close, row Delete, and bulk Delete all update shell-owned state.
- [ ] Cover the route error split required by TASK-214-04-04: query-domain
  validation errors emitted as `ApiError` pass through unchanged, while
  non-ApiError missing-resource/template sentinels map to stable `ApiError`
  responses at the route boundary.
- [ ] Assert no private `ListingTemplateManager` direct-delete or nested primary
  `New template` flow remains after the active-tab header implementation.

## Files to Change

- `tests/vitest/ui/listing-list-page-wave.test.tsx`
- `tests/vitest/ui/listings-page.test.tsx`
- `tests/vitest/ui/listings-cluster-wave.test.tsx`
- `core/admin/ui/listings/listingActionToasts.ts`
- New focused Listings component suites if needed.
- `tests/vitest/ui/list-action-toasts.test.ts`
- `tests/vitest/ui/list-pagination.test.tsx`
- `tests/vitest/ui/listing-template-manager.test.tsx` or equivalent if the
  controlled dialog/table boundary is extracted.
- `tests/vitest/admin/listingsClient.test.ts`
- `tests/vitest/admin/adminPrefetch.test.ts`
- `tests/integration/routes/listings.test.ts` for route mapping, query-domain
  validation, and strict unknown-field assertions when TASK-214-04-04 is
  implemented.

## Security Contract

- Visibility: validates internal admin UI/API only.
- Auth model: tests should preserve existing auth expectations.
- RBAC: route tests should assert `content:read` / `content:write` ownership
  where route behavior is touched.
- CSRF: client tests should preserve mutation helpers using `withCsrf: true`.
- Admin cache: client tests should prove query/template mutations keep the
  existing list/detail cache and cache-bus contracts.
- Rate-limit bucket: unchanged unless route infrastructure is touched.
- Reject-unknown validation: route tests should prove strict create/update
  payload rejection and representative query/template domain error codes when
  mapping or UI-visible save/delete feedback is touched.
- Anti-abuse: tests must prove destructive actions require confirmation and
  bulk ids are active-tab visible ids.
- Template manager tests must prove template row actions emit controlled
  callbacks instead of mutating inactive or hidden ids directly.

## Testing Requirements

- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx tests/vitest/ui/listings-page.test.tsx tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts tests/vitest/ui/list-pagination.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts tests/vitest/admin/adminPrefetch.test.ts`
  - `set -a && source .env && set +a && bun test tests/integration/routes/listings.test.ts` if route mapping changes.
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_TASKS/TASK-214-05_QA_Docs_Changelog_and_Closure.md` with final
  validation evidence when complete.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The test matrix proves tab-scoped behavior, not only static rendering.
2. Mocked suites and real component suites have clear ownership.
3. Unrelated failures are recorded separately with exact failure strings.
