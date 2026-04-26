# 748 - TASK-216 Commerce catalog list parity

Date: 2026-04-26
Version: unreleased
Tasks: TASK-216, TASK-216-01, TASK-216-01-01, TASK-216-01-02, TASK-216-02, TASK-216-02-01, TASK-216-02-02, TASK-216-02-03, TASK-216-03, TASK-216-03-01, TASK-216-03-02, TASK-216-04, TASK-216-04-01, TASK-216-04-02, TASK-216-04-03, TASK-216-05, TASK-216-05-01, TASK-216-05-02

## Key Changes

### Commerce Admin List
- Upgraded `/admin/coderso/commerce` to the Pages-style list shell while preserving the existing product-first Commerce editor route.
- Added Commerce-specific search, status, collection, and stock filters with cached collection label enrichment and missing-collection fallback copy.
- Added checkbox table selection, selected-row styling, shared pagination, and visible-row selection trimming.

### Actions and Feedback
- Added product row actions for Edit, Publish, Move to draft, Archive, and confirmed Delete.
- Added inline bulk Publish, Move to draft, Archive, and confirmed Delete scoped to currently visible selected products.
- Added a Commerce list toast adapter for lifecycle/delete/bulk feedback and kept partial bulk failures visible with failed products selected for recovery.

### Cache and Routes
- Updated `useCommerceCatalog` to hydrate product and collection caches independently, use foreground loading on cache misses, and refresh cache-bus events in the background.
- Preserved `/coderso/commerce` prefetch warmup for product and collection cached lists with `{ force: false }`.
- Added client and route-mapper coverage for CSRF lifecycle/delete writes and list-visible Commerce errors.

### Docs and QA
- Updated Commerce Catalog docs, Content List UX, Admin Cache docs, Admin Cache Map, Commerce QA report coverage split, task statuses, and task board stats.
- Validated with core lint/typecheck, targeted Vitest UI/admin suites, list-action toast coverage, pagination/cache/prefetch checks, and the Commerce route mapper test outside sandbox with repo env.
- Attempted `bun run gates:coderso`; it remains blocked after Core lint and Core typecheck by the pre-existing stale Functional UI smoke paths under `tests/unit/ui/*` while the current suites live under `tests/vitest/ui/*`.
