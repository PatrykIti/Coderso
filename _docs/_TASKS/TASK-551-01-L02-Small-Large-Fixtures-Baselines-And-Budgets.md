# TASK-551-01-L02: Small/Large Fixtures, Baselines, and Budgets
# FileName: TASK-551-01-L02-Small-Large-Fixtures-Baselines-And-Budgets.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-01
**Priority:** High
**Category:** Database / Performance / Reliability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Build reproducible, scoped fixture profiles and freeze the initial performance
budgets that all later TASK-551 leaves must meet. The large profile models
growing lists, append-heavy logs/revisions, search candidates, and aggregate
traffic without copying production data.

## File Ownership

**Allowlist:** `scripts/task-551-database-baseline.ts`,
`tests/perf/fixtures/task551DatabaseScale.ts`,
`tests/perf/fixtures/task551DatabaseBudgets.ts`, and
`tests/perf/database-query-baseline.test.ts` only.

**Forbidden:** production code, migration/meta files, task/changelog/workflow
files, and all TASK-511/517/493/518 owned paths.

## Implementation Pseudocode

```ts
type ScaleProfile = "small" | "large";

async function withTask551Dataset<T>(profile: ScaleProfile, run: (scope: FixtureScope) => Promise<T>) {
  const scope = await seedOwnedRows(profile, crypto.randomUUID());
  try { return await run(scope); }
  finally { await deleteOnlyOwnedRows(scope); }
}

async function measureQueryFamily(contract: BudgetContract, scope: FixtureScope) {
  warmBuffersWithoutResettingSharedStats();
  return sample({ iterations: contract.samples, capture: ["queryCount", "rows", "p50", "p95", "p99"] });
}

async function measurePoolAcquisitionWait(profile: ScaleProfile, sql: SqlClient) {
  // Reserve exactly the profile's declared pool capacity, synchronize one
  // additional waiter, measure reserve->acquire latency, then release every
  // reservation in finally. This is an external contention measurement and
  // does not consume TASK-551-02's later telemetry implementation.
}
```

Invalid profiles/counts fail `database_baseline_invalid`; unreachable DB fails
preflight without seeding. Measurement reports sanitized fingerprints only.

## Regression-Test Shape

- Small and large profiles seed deterministic counts with unique prefixes and
  delete only those rows.
- Run representative point/list/search/aggregate/append families; record current
  baseline separately from target budget.
- Saturate only this harness's bounded test pool and freeze acquisition-wait
  p50/p95/p99 without inspecting postgres.js internals or logging SQL/binds.
- Prove a deliberately unbounded fixture query fails the rows/query-count gate.
- Run named perf file twice and reject variance above the documented tolerance.

## Security Contract

- No routes or product writes beyond isolated test fixtures.
- Existing protected route auth/RBAC/CSRF/rate limits remain in force when route
  measurement is used.
- Reject unknown CLI/profile fields and clamp row/sample/time limits.
- Synthetic data only; no `.env` values, SQL binds, PII, or row bodies in output.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/perf/database-query-baseline.test.ts`
- `set -a && source .env && set +a && bun scripts/task-551-database-baseline.ts --profile small`
- `set -a && source .env && set +a && bun scripts/task-551-database-baseline.ts --profile large`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs; emit the sanitized budget contract for TASK-551-10-L02.

## Quantified Acceptance

- Small and large datasets match declared row counts exactly and leak zero rows
  after teardown.
- Budgets cover 100% of inventory records classified hot/release-gated.
- Pool acquisition-wait budgets are reproducible from the independent reserved-
  connection contention fixture before TASK-551-02 begins.
- Repeat-run p95 variance is at most the frozen tolerance (initial ceiling 20%);
  a later leaf cannot increase any budget without a task-contract amendment.
