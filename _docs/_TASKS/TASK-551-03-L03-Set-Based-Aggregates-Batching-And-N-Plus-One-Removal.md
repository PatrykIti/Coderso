# TASK-551-03-L03: Set-Based Aggregates, Batching, and N+1 Removal
# FileName: TASK-551-03-L03-Set-Based-Aggregates-Batching-And-N-Plus-One-Removal.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-03
**Priority:** Critical
**Category:** Database / Performance / Reliability
**Estimated Effort:** Extra Large
**Dependencies:** TASK-551-03-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace application-side aggregation, per-row lookups/writes, and unbounded
install/retry arrays with set-based SQL, explicit projections, and bounded
chunks. Split the oversized solution-kit installer before changing its behavior
while preserving rollback, webhook retry, and solution-kit product contracts.

## Exact File Ownership

**Production:** `core/services/analytics/analyticsService.ts`,
`core/services/analytics/trafficAggregationService.ts`,
`core/services/dashboard/dashboardService.ts`,
`core/services/webhooks/webhooksService.ts`,
`core/services/kits/solutionKitsInstallService.ts`,
`core/services/kits/solutionKitInstallTypes.ts`,
`core/services/kits/solutionKitInstallSnapshots.ts`,
`core/services/kits/solutionKitInstallOperations.ts`, and
`core/services/kits/solutionKitInstallRunRepository.ts`.

**Tests:** `tests/unit/analytics/analyticsService.test.ts`,
`tests/unit/dashboard/dashboardService.test.ts`,
`tests/unit/webhooks/webhooksService.test.ts`,
`tests/unit/kits/solutionKitsService.test.ts`,
`tests/integration/routes/solutionKitsRoutes.test.ts`, and
`tests/perf/database-set-based-batch-budgets.test.ts`.

No other files may be edited. The whole `core/services/seo/seoService.ts` and
`core/services/tools/importExportService.ts`, including their tests and query
optimization, belong exclusively to TASK-551-09 after TASK-493/TASK-511
serialization; this leaf must not edit or partially extract them. TASK-511,
TASK-493, TASK-517, and TASK-518 paths, all schema/migrations, routes, cache
files, task/changelog/workflow files are forbidden.

## Implementation Pseudocode

```ts
async function loadDashboardSummary(scope: Scope, db: Db): Promise<Summary> {
  // One bounded CTE/aggregate query per independent consistency boundary;
  // FILTER/COUNT/SUM in SQL, explicit scalar projections, no select-all.
}

async function processInChunks<T>(source: AsyncIterable<T>, max = 250, write: ChunkWriter): Promise<void> {
  for await (const chunk of boundedChunks(source, max)) {
    await write(chunk); // set-based INSERT/UPDATE with bounded bind count
  }
}

async function installSolutionKit(command: InstallCommand, deps: Deps): Promise<InstallResult> {
  const plan = await buildInstallOperations(command, deps); // bounded, deterministic
  return deps.db.transaction(tx => applyOperationsInChunks(plan, tx));
  // Persist one run summary/snapshot boundary, map stable domain errors, rollback all.
}
```

Extract types, snapshots, operation planning, and run persistence before adding
logic; leave `solutionKitsInstallService.ts` as an orchestration facade below
1,000 lines. Prefer joins/grouped CTEs or batched `IN` reads over loops. Exports
are outside this leaf. Webhook retries and solution-kit operation application
operate in bounded chunks without changing atomicity/idempotency.

## Regression-Test Shape

- Instrument DB executors and prove query counts are constant from 10 to 100k
  fixtures: dashboard/analytics `<= 8`, webhook retry selection `<= 3`, and
  each solution-kit batch chunk `<= 3` statements excluding transaction
  boundaries.
- Compare set-based output byte-for-byte with existing small-fixture semantics,
  including zero/null buckets, time zones, and deterministic order.
- Test 0/1/boundary/boundary+1/multi-chunk sizes, mid-chunk failure rollback,
  retry idempotency, maximum bind count, and no whole-table materialization.
- Solution-kit tests prove preview/apply/rollback parity and original facade API;
  webhook tests prove deterministic bounded selection and retry idempotency.

## Security Contract

- Existing endpoints retain visibility, session/API-key auth, RBAC, CSRF for
  internal writes, current rate-limit buckets, and strict reject-unknown schemas.
- No new public endpoint or write. Existing webhook signature/replay controls
  remain mandatory; batch processing never bypasses tenant/resource scoping.
- Projections exclude secret/provider fields; logs expose operation counts and
  statement families only, never SQL binds, imported content, webhook payloads,
  tokens, or PII.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/unit/analytics/analyticsService.test.ts tests/unit/dashboard/dashboardService.test.ts tests/unit/webhooks/webhooksService.test.ts tests/unit/kits/solutionKitsService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/solutionKitsRoutes.test.ts tests/perf/database-set-based-batch-budgets.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Provide final query-count, chunk-size, transaction, and service
split contracts to TASK-551-10-L02.

## Quantified Acceptance

- Query counts stay within the fixed budgets above when fixture cardinality
  grows 10,000x; no caller performs DB work inside an input-length loop.
- Default chunk is at most 250 records and every generated statement remains
  below 10,000 bind parameters.
- Large install/retry plans keep peak process memory below the L01 baseline
  budget and preserve small-fixture result identity.
- SEO and import/export source/tests remain byte-untouched and are handed to
  TASK-551-09 as whole-module owners; there is no split-writer overlap.
- Every touched/split production and test file is at most 1,000 physical lines.
