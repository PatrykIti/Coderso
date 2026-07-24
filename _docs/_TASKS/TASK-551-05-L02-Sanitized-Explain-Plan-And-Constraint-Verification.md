# TASK-551-05-L02: Sanitized EXPLAIN Plan and Constraint Verification
# FileName: TASK-551-05-L02-Sanitized-Explain-Plan-And-Constraint-Verification.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-05
**Priority:** Critical
**Category:** Database / Performance / Test Integrity
**Estimated Effort:** Large
**Dependencies:** TASK-551-05-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create reproducible small/large EXPLAIN evidence and direct constraint race
tests for every L01 index/constraint. Evidence is sanitized before persistence,
uses synthetic fixtures, compares plans and rows rather than brittle total-cost
strings, and fails when a promised hot query regresses.

## File Ownership

**Allowlist:** `scripts/task-551-explain-plans.ts`,
`tests/perf/fixtures/task551QueryPlanContracts.ts`,
`tests/perf/database-explain-plans.test.ts`, and
`tests/integration/database/concurrencyConstraints.test.ts` only.

**Forbidden:** all production/schema/migration files; L01 tests; TASK-493,
TASK-511, TASK-517, TASK-518 paths; cache, task/changelog/workflow files.

## Implementation Pseudocode

```ts
type PlanContract = StrictReadonly<{
  inventoryId: string;
  statementFamily: string;
  statement: StaticPlanStatement; // compile-time registry member; never CLI SQL
  syntheticBinds: readonly SafeScalar[];
  expectedIndex?: string;
  forbiddenLargeNodes: readonly string[];
  maxRowsReadRatio: number;
  maxP95Ms: number;
}>;

async function captureSanitizedPlan(contract: PlanContract, db: Db): Promise<SafePlanEvidence> {
  const raw = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${contract.statement}`);
  return sanitizePlan(raw, { removeSql: true, removeBinds: true, allowCatalogNames: true });
}

async function raceRevisionInsert(parentId: string, attempts: number): Promise<RaceOutcome> {
  // Unique synthetic parent, synchronized starts, allSettled, scoped cleanup.
}
```

`StaticPlanStatement` is a closed discriminated union exported by the fixture
registry; CLI input selects only its stable ID and cannot supply SQL text. The
script supports `--scale small|large --check`, permits only that static
statement registry, and refuses arbitrary SQL/paths. Plan comparison tolerates
planner-node differences on small data but requires expected indexes and bounded
row ratios on large fixtures. Errors are `plan_contract_invalid`,
`plan_regression`, and `constraint_contract_failed`.

## Regression-Test Shape

- Cover every L01 selected index and named constraint, including all seven
  generated-vector GIN indexes and outbox pending/claim/processed indexes;
  registry/catalog set equality prevents missing evidence.
- Large plans assert index names, predicates, absence of forbidden full scans/
  external sorts, rows-read ratio, buffer budget, and p95 over repeated warm and
  cold-declared runs. Do not set `enable_seqscan = off`.
- Race 50 revision allocations for page/entry/post/widget/detail-page parents
  and 50 overlapping/non-overlapping booking attempts; only invariant-compatible
  rows commit and cleanup deletes only fixture-owned rows.
- Snapshot sanitizer tests inject emails, tokens, SQL, bind values, and plan
  fields; zero forbidden values survive output.
- Re-run each named failing perf file alone before classifying a failure.

## Security Contract

- Internal test/tooling only; no route, auth, RBAC, CSRF, rate-limit,
  nonce/HMAC, or CAPTCHA changes.
- Static allowlisted statements and synthetic fixture IDs only. Never accept
  arbitrary SQL, production binds, unredacted customer data, or credentials.
- Persist statement family, catalog/index names, counters, timing, and sanitized
  plan shape only; raw EXPLAIN output stays ephemeral.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/perf/database-explain-plans.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/database/concurrencyConstraints.test.ts`
- `set -a && source .env && set +a && bun scripts/task-551-explain-plans.ts --scale small --check`
- `set -a && source .env && set +a && bun scripts/task-551-explain-plans.ts --scale large --check`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

No shared docs. Pass the sanitized before/after table, write/storage tradeoffs,
constraint outcomes, and rollback commands to TASK-551-10-L02.

## Quantified Acceptance

- Evidence registry covers 100% of L01 additions and contains zero raw SQL bind,
  credential, token, email, or customer-content leakage.
- Every large-fixture hot plan uses its intended index, stays within its declared
  rows/buffer/p95 budget, and has no forbidden growing-table sequential scan.
- Fifty-way races preserve all five revision uniqueness families and booking
  exclusion with zero duplicate/partial state; fixture cleanup is scope-local.
