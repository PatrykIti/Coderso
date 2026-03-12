# Runner Ownership Matrix

Snapshot date: `2026-03-06`

This document is the practical ownership companion to `_docs/TESTING_STRATEGY.md`.

## Current classification snapshot

- Likely `move to Vitest`: `256` unit suites
- Likely `keep in Bun`: `60` unit suites
- Likely `refactor first`: `113` unit suites

## Strong Vitest ownership clusters

- `tests/unit/ui/*`
- `tests/unit/admin/*`
- `tests/unit/widgets/*`
- `tests/unit/pageBuilder/*`
- `tests/unit/sdk/*`
- `tests/integration/ui/*` (migrated to `tests/vitest/ui-integration/*`)

## Follow-up migration notes (2026-03-12)

- Legacy Bun-free duplicates were removed from `tests/unit/ui/*`, the Bun-free part of `tests/unit/admin/*`, `tests/unit/sdk/*`, and `tests/unit/customScreens/*` after confirming Vitest-owned replacements.
- `tests/unit/validation/*` has now been moved into `tests/vitest/validation/*`.
- The Bun-free assistant helper slice (`assistantMetrics`, `assistantQuota`, `assistantRedaction`, `openRouterProvider`, `siteBuilderPlanner`) has now been moved into `tests/vitest/assistant/*`.
- The Bun-free posts editor/model helper slice has now been moved into `tests/vitest/posts/*`, while the DB/runtime post cases remain in Bun.
- `search` remains split:
  - `searchHistoryService` stays in Bun because it is DB-backed,
  - the remaining search unit suites are still blocked by import-time DB coupling and remain refactor-first.

## Strong Bun ownership clusters

- DB-backed service tests
- plugin lifecycle tests
- `tests/integration/routes/*`
- `tests/integration/runtime/*`
- `tests/integration/server/*`
- `tests/integration/store/*`
- `tests/perf/*`
- `tests/security/*`

## Refactor-first clusters

- `assistant`
- `posts`
- `forms`
- `search`
- `server`
- `validation`

These areas often mix pure logic with DB or runtime adapters and should be split before further migration.

## Bun coverage hotspots from baseline report

Representative low-coverage files from `coverage/bun/lcov.info`:

| File | Line coverage |
|------|---------------|
| `core/admin/utils/cacheBus.ts` | `1.33%` |
| `core/admin/services/cachePolicy.ts` | `1.79%` |
| `packages/sdk/src/pluginManifest.ts` | `3.50%` |
| `core/services/search/filterContract.ts` | `3.79%` |
| `core/services/customScreens/bindingResolver.ts` | `6.15%` |
| `core/widgets/core/contentList.tsx` | `6.18%` |

## Operational rule

- If a suite does not require Bun runtime, it should not stay in Bun just to preserve old structure.
- If a suite requires DB/runtime/plugin lifecycle behavior, keep it in Bun even if that slows down migration.
