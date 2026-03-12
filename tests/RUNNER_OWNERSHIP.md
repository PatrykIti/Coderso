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
- The Bun-free forms contract/helper slice has now been moved into `tests/vitest/forms/*`, while DB-backed service/submission cases remain in Bun.
- The Bun-free forms automation runner core now lives in `core/services/forms/formAutomationRunnerCore.ts`, and its orchestration suite has moved to `tests/vitest/forms/formAutomationRunnerCore.test.ts`; the runtime wrapper in `formAutomationRunner.ts` remains lazy and server-owned.
- The Bun-free server helper slice (`errorHandler`, `requestBody`, `routeMatcher`, `solutionKitSchemas`, `styleUrl`) has now been moved into `tests/vitest/server/*`.
- The Bun-free search pure-logic slice (`filterEngine`, `listingRuntimeService`, `searchIndexService`, `searchService`) has now been moved into `tests/vitest/search/*`.
- `search` remains split:
  - `searchHistoryService` stays in Bun because it is DB-backed,
  - the remaining search unit backlog is now the DB-backed history case only.

## Refactor-first closure update (2026-03-12)

- The original refactor-first blocker set from the 2026-03-06 snapshot is now either migrated to Vitest or intentionally left in Bun for DB/runtime reasons.
- `formAutomationRunner` was the last mixed forms blocker in that set and is now closed through the new Vitest-owned core plus lazy runtime wrapper.

## Strong Bun ownership clusters

- DB-backed service tests
- plugin lifecycle tests
- `tests/integration/routes/*`
- `tests/integration/runtime/*`
- `tests/integration/server/*`
- `tests/integration/store/*`
- `tests/perf/*`
- `tests/security/*`

## Historical refactor-first clusters

- `assistant`
- `posts`
- `forms`
- `search`
- `server`
- `validation`

These areas described the 2026-03-06 baseline and have since been addressed by the migration and refactor waves above.

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
