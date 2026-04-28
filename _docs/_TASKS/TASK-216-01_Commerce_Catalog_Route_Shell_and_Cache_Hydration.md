# TASK-216-01: Commerce Catalog Route Shell and Cache Hydration
# FileName: TASK-216-01_Commerce_Catalog_Route_Shell_and_Cache_Hydration.md

**Priority:** High
**Category:** Coderso Commerce + Admin Cache + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-216, TASK-054-11-05-01, TASK-206
**Status:** Done (2026-04-26)

---

## Overview

Repair the Commerce catalog shell and cache lifecycle before table/action work
lands. `/admin/coderso/commerce` should hydrate products and collections from
cache immediately, refresh in the background when cache exists, foreground load
only when cache is absent, and preserve the existing prefetch warmup path.

## Sub-Tasks

- [x] TASK-216-01-01: Product and Collection Cache Hydration
- [x] TASK-216-01-02: Commerce Shell, Header New, and Prefetch Contract

## Security Contract

- Visibility: internal Commerce admin UI and read hooks only.
- Auth model: existing authenticated admin session / admin API key path.
- RBAC: `commerce:read` for product and collection list reads.
- CSRF: no writes in this subtask.
- Rate-limit bucket: existing `admin_read`.
- Reject-unknown validation: unchanged; no new payload shape.
- Anti-abuse: no public path or user-controlled server query is introduced.

## Testing Requirements

- Cached product list renders without foreground loading copy.
- Cached collection list is available for filters/enrichment before background
  refresh settles.
- Product and collection cache-bus events refresh only the matching family.
- `/coderso/commerce` prefetch still uses cached list helpers with
  `{ force: false }`.
- Commands:
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/commerce-page.test.tsx`
  - `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/admin/commerceClient.test.ts tests/vitest/admin/adminPrefetch.test.ts tests/vitest/admin/cacheRefresh.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md`
- `_docs/ADMIN_CACHE_MAP.md`
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. Commerce list mount semantics match the shared admin cache policy.
2. Product and collection cache owners remain in `commerceClient` /
   `useCommerceCatalog`.
3. Shell changes do not alter product editor or runtime Commerce behavior.

## Closure Evidence

- Completed on 2026-04-26 as part of TASK-216 Commerce catalog list parity.
- Validation: `bun --cwd core lint`, `bun --cwd core lint:types`, targeted Vitest Commerce UI/admin/pagination/toast/prefetch suites, `bun test tests/integration/routes/commerceRoutes.test.ts` outside sandbox with repo env, and Commerce runtime smoke tests outside sandbox with repo env.
- Gate note: `bun run gates:coderso` was attempted and remains blocked by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*`; current matching UI suites live under `tests/vitest/ui/*`.
