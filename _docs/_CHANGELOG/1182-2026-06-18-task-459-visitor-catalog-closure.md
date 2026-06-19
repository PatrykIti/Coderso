# 1182 - TASK-459 Visitor Catalog Closure

**Date:** 2026-06-18
**Version:** Unreleased
**Tasks:** TASK-459, TASK-459-05

## Key Changes

### Task Board
- Closed TASK-459 and TASK-459-05 as `Done` after the final live catalog
  demo and validation evidence passed.
- Updated `_docs/_TASKS/README.md` statistics and moved both records from
  `In Progress` to `Done`.
- Kept TASK-459-01 through TASK-459-04 covered by changelog 1166 and recorded
  the final TASK-459-05 closure here.

### Closure Evidence
- Recorded the fresh live `coderso-dev-core-host` + `playwright-cli` catalog
  smoke for the visitor catalog journey: published-only listing render,
  filters, sort, pagination, shareable pretty URLs, fresh-context URL restore,
  no-JS/mobile GET fallback, price-range aliasing, and working detail routes.
- Confirmed the implementation remained code-complete without additional
  product-code changes.

## Validation

- `bun --cwd core lint`: passed.
- `bun --cwd core lint:types`: passed.
- `./node_modules/.bin/tsc -p tsconfig.json --noEmit`: passed.
- `bun run test:vitest`: `681/681` suites, `4149/4149` tests passed.
- Targeted Bun listing/runtime suites:
  `tests/unit/content/contentListResolver.test.ts`,
  `tests/unit/content/listingPushdown.test.ts`,
  `tests/unit/site/cache.test.ts`,
  `tests/integration/runtime/pages-runtime.test.ts`: `37 pass`.
- `bun test tests/unit/content/queryBuilderService.test.ts`: `18 pass`.
- `bun test tests/perf/codersoPerformanceGate.test.ts`: `3 pass`.
- `bun run gates:coderso`: functional, ux, performance, security, and
  reliability gates passed.
- Dev DB listing indexes verified:
  `content_entries_data_gin_idx`,
  `content_entries_type_status_published_idx`.
- `playwright-cli -s=task459-live-catalog run-code --filename .tmp/task-459-live-catalog-smoke.js`:
  passed against
  `http://coderso-a.localhost:3000/task-459-live-task459-mqjw83wg`.

## Evidence Artifacts

- `.tmp/task-459-live-catalog-desktop.png`
- `.tmp/task-459-live-catalog-filtered-page2.png`
- `.tmp/task-459-live-catalog-mobile-nojs.png`
- `.tmp/task-459-live-catalog-smoke.js`
- `.tmp/coderso-release-gates.json`
