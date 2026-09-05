# TASK-551-02-L03: Measure Wiring And Pool Telemetry Gates
# FileName: TASK-551-02-L03-Measure-Wiring-And-Pool-Telemetry-Gates.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Observability / Perf Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-551-02-L02
**Status:** ⏳ To Do

---

## Overview

Close the known L02 test gap without taking over domain source ownership.
`measureDatabaseQuery` and `probeDatabasePoolHealth` are closed, gate-verified
L02 APIs, while `tests/perf/database-pool-telemetry.test.ts` requires a real
pool. Current source state has no L03-authorized production caller: the reviewed
TASK-551-01 inventory assigns caller source files to their respective domain
leaves, including the later TASK-551-03 bounded-read and aggregate work. This
leaf therefore authors the one real-pool consumer test only. It neither wires
services nor creates an open-ended telemetry-adoption surface.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `tests/perf/database-pool-telemetry.test.ts` only.

**Forbidden L02 surface:** `core/db/client.ts`, `core/db/databaseLifecycle.ts`,
`core/db/databaseApplicationIdentity.ts`, `core/db/queryFingerprintRegistry.ts`,
`core/db/queryTelemetry.ts`, `core/server/runtimeLifecycle.ts`,
`core/server/runtimeEntrypoint.ts`, `core/server/prod.ts`, `core/server/dev.ts`,
`scripts/task-551-pg-stat-interval.ts`,
`tests/vitest/db/queryFingerprintRegistry.test.ts`,
`tests/vitest/db/databaseApplicationIdentity.test.ts`,
`tests/integration/server/task551DatabaseLifecycle.test.ts`,
`tests/integration/server/task551RuntimeEntrypoints.test.ts`, and
`tests/perf/database-pg-stat-interval.test.ts`. These files remain solely L02's
responsibility; L03 imports their public API only through the test.

**Forbidden domain surface:** every production caller source, including
`core/services/analytics/analyticsService.ts`,
`core/services/analytics/trafficAggregationService.ts`,
`core/services/dashboard/dashboardService.ts`,
`core/services/webhooks/webhooksService.ts`,
`core/services/webhooks/deliveryService.ts`, and all solution-kit persistence
modules reserved by TASK-551-03-L03; all other `core/services/**` source;
schema/migrations; route files; cache/Redis 07/08 paths; and task/changelog/
workflow files. No future source or test path may be added to this leaf. A
domain leaf may later adopt `measureDatabaseQuery` only after its own contract
names a concrete caller path and its direct regression test.

## Implementation Pseudocode

```ts
// tests/perf/database-pool-telemetry.test.ts only
import { probeDatabasePoolHealth } from "../../core/db/client";
import {
  databaseTelemetry,
  measureDatabaseQuery,
} from "../../core/db/queryTelemetry";

const fingerprint = exactClosedFingerprintFromL02Registry();
databaseTelemetry.reset();

const value = await measureDatabaseQuery({
  family: "point",
  fingerprint,
  // The test-bound operation uses the real configured pool. It does not add a
  // production caller or create a fingerprint from SQL, binds, or input.
  run: () => runScopedPoolFixtureOperation(),
  rowsReturned: () => 1,
});

const pool = await probeDatabasePoolHealth();
assertExactClosedSnapshot(databaseTelemetry.snapshot(), { value, pool });
await assertEveryReservedTestSessionReleased();
```

The test uses only a registry fingerprint already reviewed in
`tests/perf/fixtures/task551QueryInventory.ts`; it does not edit the registry or
assert coverage for production callers owned elsewhere. Its fixture operation
may use a bounded test query, but its SQL, binds, URLs, errors, and labels must
not enter a telemetry snapshot or test output.

## Regression-Test Shape

```ts
// tests/perf/database-pool-telemetry.test.ts (bun lane, requires DATABASE_URL)
// - configure a real test pool (>=2 sessions); source repo env first.
// - invoke L02's public measureDatabaseQuery API through a scoped test operation.
// - assert databaseTelemetry.snapshot() contains exactly the expected closed
//   family/fingerprint/duration/outcome/rows aggregates.
// - assert a failing operation observes driver_error and preserves the original
//   error object identity.
// - assert probeDatabasePoolHealth records one bounded sample and releases
//   every reserved session (pool returns to idle).
// - sentinel sweep: snapshot/log output contains no SQL text, binds, URLs.
```

The Vitest complement remains L02-owned: inject a fake sink into
`measureDatabaseQuery` in its existing registry test; no DB is required there.

## Security Contract

- No routes touched; endpoint visibility/auth/RBAC/CSRF/rate-limit unchanged.
- Telemetry labels remain closed registry fingerprints; caller SQL, binds,
  URLs, secrets, and free-form strings are structurally rejected by the sink.
- No secret or credential may appear in snapshots or test output.

## Validation Commands (DB-dependent; requires reachable DATABASE_URL)

- `task551-db-test` runs only through TASK-551-11's owner-injected private map,
  which supplies the one DB binding plus fixed OS keys with no inherited
  environment. This leaf never loads, maps, or inspects a source.
- `bun --env-file=/dev/null test tests/perf/database-pool-telemetry.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bunx vitest run tests/vitest/db/queryFingerprintRegistry.test.ts` (guard)
- `bun run gates:coderso`
- `bun run gates:coderso:perf`

## Documentation Updates Required

None; TASK-551-10-L02 owns prose/changelog 1310.

## Quantified Acceptance

- Exactly one file is changed by this leaf: the real-pool test. It proves
  observed aggregates, error preservation, bounded probe release, and sanitized
  output on a live PostgreSQL fixture without editing a production caller.
- Any later production adoption is rejected here unless the owning domain leaf
  first adds the concrete source path and its direct test to its own task
  contract; wildcard or future-path ownership is invalid.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-02-L03",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-02"
  },
  "allowlist": ["tests/perf/database-pool-telemetry.test.ts"],
  "forbiddenPaths": [
    "core/db/client.ts",
    "core/db/databaseLifecycle.ts",
    "core/db/databaseApplicationIdentity.ts",
    "core/db/queryFingerprintRegistry.ts",
    "core/db/queryTelemetry.ts",
    "core/server/runtimeLifecycle.ts",
    "core/server/runtimeEntrypoint.ts",
    "core/server/prod.ts",
    "core/server/dev.ts",
    "scripts/task-551-pg-stat-interval.ts",
    "tests/vitest/db/queryFingerprintRegistry.test.ts",
    "tests/vitest/db/databaseApplicationIdentity.test.ts",
    "tests/integration/server/task551DatabaseLifecycle.test.ts",
    "tests/integration/server/task551RuntimeEntrypoints.test.ts",
    "tests/perf/database-pg-stat-interval.test.ts",
    "core/services/analytics/analyticsService.ts",
    "core/services/analytics/trafficAggregationService.ts",
    "core/services/dashboard/dashboardService.ts",
    "core/services/webhooks/webhooksService.ts",
    "core/services/webhooks/deliveryService.ts"
  ],
  "dependencies": ["TASK-551-02-L02:single"],
  "commands": [
    {
      "id": "pool-telemetry-test",
      "lane": "bun-test",
      "environmentProfile": "task551-db-test",
      "argv": ["bun", "--env-file=/dev/null", "test", "tests/perf/database-pool-telemetry.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/perf/database-pool-telemetry.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "core-lint-types",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint:types"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "core-lint",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "--cwd", "core", "lint"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "fingerprint-registry-guard",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bunx", "vitest", "run", "tests/vitest/db/queryFingerprintRegistry.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/db/queryFingerprintRegistry.test.ts"],
        "minimum": 1
      }
    },
    {
      "id": "coderso-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso"],
      "positiveDiscovery": { "kind": "not-applicable" }
    },
    {
      "id": "performance-gate",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["bun", "run", "gates:coderso:perf"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-02-L02:single"],
      "commandIds": [
        "pool-telemetry-test",
        "core-lint-types",
        "core-lint",
        "fingerprint-registry-guard",
        "coderso-gate",
        "performance-gate"
      ]
    }
  ]
}
```
