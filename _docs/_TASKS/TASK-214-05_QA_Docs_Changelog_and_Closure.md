# TASK-214-05: QA, Docs, Changelog, and Closure
# FileName: TASK-214-05_QA_Docs_Changelog_and_Closure.md

**Priority:** Medium
**Category:** QA + Documentation
**Estimated Effort:** Medium
**Dependencies:** TASK-214-01, TASK-214-02, TASK-214-03, TASK-214-04
**Status:** To Do

---

## Overview

Close the Listings tabbed list parity family with targeted validation,
documentation updates, changelog entry, and task board synchronization.

The closure pass must validate the tab-scoped behavior live in the current repo:
`New`, selection, bulk actions, confirmations, and toasts must all follow the
active tab, while query/template contracts remain separate.

## Sub-Tasks

- [ ] TASK-214-05-01: Listings Parity Test Matrix
- [ ] TASK-214-05-02: Docs, Changelog, and Board Closure
- [ ] Record unrelated failures separately with exact failure strings.
- [ ] Preserve active `Queries` / `Templates` tab behavior in the source report
  or manual QA notes if a Playwright report is updated.

## Files to Change

- `_docs/CONTENT_LIST_UX.md`
- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/CMS_API.md` if route errors/examples changed.
- `_docs/ARCHITECTURE.md` if Listings admin behavior changed materially.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Security Contract

- Visibility: verifies internal admin UI/API only.
- Auth model: verify existing authenticated admin session/admin API key model
  remains unchanged.
- RBAC: verify `content:read` and `content:write` ownership remains on the
  existing route boundaries.
- CSRF: verify all Listings mutations still use CSRF-backed admin client
  helpers.
- Rate-limit bucket: verify reads remain in `admin_read` and writes remain in
  `admin_write`.
- Reject-unknown validation: verify query/template schemas still reject unknown
  top-level fields.
- Anti-abuse: verify destructive row/bulk actions require confirmation and no
  public write path was introduced.

## Testing Requirements

- Run:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listing-list-page-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/listings-cluster-wave.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-pagination.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/listingsClient.test.ts`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/adminPrefetch.test.ts`
- Run DB-backed route tests when route/error mapping changes:
  - `set -a && source .env && set +a`
  - `bun test tests/integration/routes/listings.test.ts`
- If runtime widgets or listing preview contracts changed, also run:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/listingFilters.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/search/listingRuntimeService.test.ts`
  - `bun test tests/perf/codersoPerformanceGate.test.ts` if query execution or
    runtime listing behavior changed.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
  - Document Listings tabbed list parity, active-tab `New`, tab-local bulk
    actions, and query/template toast behavior.
- `_docs/ADMIN_CACHE.md`
  - Document cache-present/background behavior for both query and template list
    caches if changed.
- `_docs/ADMIN_CACHE_MAP.md`
  - Keep Listings cached APIs and prefetch owner map aligned.
- `_docs/CMS_API.md`
  - Update only if route errors/request examples changed.
- `_docs/_TASKS/README.md`
  - Move TASK-214 family to Done and update statistics on completion.
- `_docs/_CHANGELOG/*`
  - Add completed task entry.
- `_docs/_CHANGELOG/README.md`
  - Index the changelog entry.

## Acceptance Criteria

1. All targeted suites pass or unrelated failures are isolated with exact
   failure strings.
2. Docs describe final Listings tabbed list behavior and cache contract.
3. Task statuses, board statistics, and changelog index are synchronized.
4. Remaining Listings gaps are explicit and not hidden as completed parity work.
