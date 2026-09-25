# TASK-551-02-L01: Validated Database Configuration and Cluster Budget
# FileName: TASK-551-02-L01-Validated-Database-Configuration-And-Cluster-Budget.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure
**Estimated Effort:** Small
**Dependencies:** TASK-551-01 initial exact-set receipt and TASK-551-01-L02
**Status:** ⏳ To Do
**Changelog:** 1310 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a Bun-free strict configuration owner for pool size, cluster connection
budget, connect/idle/lifetime/query/lock/idle-in-transaction timeouts,
PgBouncer mode, and the session-affine maintenance connection contract. It must
not import `db/client` or create network connections. The same exported fleet
parser is consumed by application identity and migration rollout; no leaf owns a
second runtime/worker count parser.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/db/databaseConfig.ts` and
`tests/vitest/db/databaseConfig.test.ts` only.

**Forbidden:** `core/db/client.ts` (L02 owner), schema/migrations, route/service
source, cache/Redis paths, and all active TASK-511/517/493/518 paths.

## Implementation Pseudocode

```ts
type DatabaseFleetConfig = Readonly<{
  runtimeProcessCount: number;
  workerProcessCount: number;
  totalProcessCount: number;
}>;

type DatabaseRuntimeConfig = Readonly<{
  fleet: DatabaseFleetConfig;
  poolMax: number;
  serverMaxConnections: number;
  reservedConnections: number;
  migrationConnectionReserve: number;
  connectTimeoutSeconds: number;
  idleTimeoutSeconds: number;
  maxLifetimeSeconds: number;
  statementTimeoutMs: number;
  lockTimeoutMs: number;
  idleInTransactionTimeoutMs: number;
  pgbouncerMode: "off" | "transaction";
  maintenanceMode: "primary" | "direct" | "session";
  maintenancePoolMax: number;
  maintenanceUrlConfigured: boolean; // presence only; never the secret
}>;

export function parseDatabaseFleetConfig(
  env: Readonly<Record<string, string | undefined>>,
): DatabaseFleetConfig {
  const runtimeProcessCount = strictInteger(env.CODERSO_RUNTIME_REPLICA_COUNT ?? "1", 1, 256);
  const workerProcessCount = strictInteger(env.CODERSO_WORKER_REPLICA_COUNT ?? "0", 0, 256);
  return Object.freeze({
    runtimeProcessCount,
    workerProcessCount,
    totalProcessCount: safeAdd(runtimeProcessCount, workerProcessCount),
  });
}

export function parseDatabaseRuntimeConfig(env: Readonly<Record<string, string | undefined>>) {
  const config = strictParseAndClamp(env);
  const minimumReserved = Math.ceil(config.serverMaxConnections * 20 / 100);
  const processPools = safeMultiply(config.poolMax, config.fleet.totalProcessCount);
  const planned = processPools
    + (config.maintenanceMode === "primary"
      ? 0
      : safeMultiply(config.maintenancePoolMax, config.fleet.totalProcessCount))
    + config.migrationConnectionReserve;
  const available = config.serverMaxConnections - config.reservedConnections;
  if (config.reservedConnections < minimumReserved || available <= 0 || planned >= available)
    throw new Error("database_connection_budget_invalid");
  return Object.freeze(config);
}
```

The exact accepted environment contract is:

| Key | Default | Accepted bound |
|---|---:|---:|
| `DB_POOL_MAX` | `10` | integer `1..50` |
| `CODERSO_RUNTIME_REPLICA_COUNT` | `1` | integer `1..256`; number of runtime processes that each own one `DB_POOL_MAX` pool |
| `CODERSO_WORKER_REPLICA_COUNT` | `0` | integer `0..256`; number of worker processes that each own one `DB_POOL_MAX` pool |
| `DB_SERVER_MAX_CONNECTIONS` | `103` | integer `10..10_000` |
| `DB_RESERVED_CONNECTIONS` | `21` | integer `1..5_000`, less than server maximum and at least `ceil(server maximum × 20 / 100)` unless TASK-551-01 evidence explicitly amends the contract |
| `DB_MIGRATION_CONNECTION_RESERVE` | `3` | integer `3..8`; one reserved migration/advisory-lock session plus two simultaneous activity-visibility probes |
| `DB_CONNECT_TIMEOUT_SECONDS` | `10` | integer `1..60` |
| `DB_IDLE_TIMEOUT_SECONDS` | `30` | integer `1..600` |
| `DB_MAX_LIFETIME_SECONDS` | `1800` | integer `60..86_400` |
| `DB_STATEMENT_TIMEOUT_MS` | `15_000` | integer `100..120_000` |
| `DB_LOCK_TIMEOUT_MS` | `5_000` | integer `50..30_000`, not greater than statement timeout |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | `30_000` | integer `1_000..120_000` |
| `DB_PGBOUNCER_MODE` | `off` | exact enum `off|transaction` |
| `DB_MAINTENANCE_MODE` | `primary` | exact enum `primary|direct|session` |
| `DB_MAINTENANCE_POOL_MAX` | `2` | integer `2..4`; budgeted only when maintenance mode is `direct|session` |
| `DB_MAINTENANCE_URL` | absent | secret; forbidden with `primary`, required and non-blank with `direct|session`, and never returned |

`DATABASE_URL` remains the separately required secret consumed by L02 and is
never returned by this parser. `DB_MAINTENANCE_URL` is likewise consumed only
by L02; L01 returns the non-secret `maintenanceUrlConfigured` boolean so
callers cannot accidentally log or serialize the URL. Reject unknown `DB_*`
keys owned by Coderso, but
do not reject unrelated process variables or standard `PG*` variables. Reject
legacy `DB_REPLICA_COUNT` and `DB_WORKER_CONNECTION_RESERVE`: accepting either
would permit a fleet declaration that disagrees with application identity or
the migration adapter. Explicit
malformed/out-of-range values fail; they are never silently clamped. PgBouncer
transaction mode maps to postgres.js `prepare: false`. Non-integers, overflow,
negative values, unsafe timeout ordering, insufficient reserve, or zero
operational headroom fail with machine-readable codes.

The compatibility matrix is closed and startup-relevant:

| Main mode | Maintenance mode | Result |
|---|---|---|
| `off` | `primary` | ordinary DB traffic is valid for `DB_POOL_MAX=1..50`; session-affine maintenance is only a candidate when pool capacity is at least 2 and L02's live probe passes |
| `transaction` | `primary` | ordinary traffic is valid, but session-affine maintenance is unavailable; L02 returns `database_maintenance_session_unavailable` and an enabled L03 scheduler must fail startup before traffic |
| either | `direct` | require a distinct `DB_MAINTENANCE_URL` that reaches PostgreSQL directly; create a dedicated pool with prepared statements enabled |
| either | `session` | require a distinct `DB_MAINTENANCE_URL` that reaches PgBouncer in session-pooling mode; create a dedicated pool with `prepare:false` |

When the main mode is `transaction`, a maintenance URL byte-identical to
`DATABASE_URL` is rejected without putting either value in the error. A
declared maintenance mode named `transaction` is invalid. Configuration
validation is necessary but not sufficient: L02 owns the live session-affinity
probe. Ordinary primary-mode DB startup does not run that consumer-specific
probe. L03 gates enabled scheduler startup on it; therefore `off + primary +
DB_POOL_MAX=1` starts a normal small-site process when the scheduler is disabled
and fails before listen only when session-affine work is enabled. Explicit
`direct|session` selection may still be probed during DB startup because it
declares dedicated infrastructure and always budgets at least two maintenance
sessions.
After safe-integer bounds, compute `minimumReserved = ceil(serverMax * 20 / 100)`,
`available = serverMax - reserved`, and
`planned = (runtimeProcessCount + workerProcessCount) * poolMax +
(maintenanceMode === "primary" ? 0 : (runtimeProcessCount +
workerProcessCount) * maintenancePoolMax) + migrationConnectionReserve`.
Every runtime and worker process owns one primary pool; every process also owns
the distinct maintenance pool when that mode is selected. The migration reserve
is at least three because the rollout uses one reserved physical connection for
its advisory lock/GUC-bound Drizzle transaction and two simultaneous named
visibility probes. Require
`reserved >= minimumReserved` and strictly `planned < available`; equality fails.

## Testing Requirements

- Default resolves to runtime/worker counts `1/0`, pool 10, primary maintenance,
  migration reserve 3, planned 13,
  minimum/reserved 21, and available 82
  under the 103-connection ceiling.
- Multi-runtime, worker, combined-fleet, reserved-headroom, numeric overflow,
  malformed values,
  exact defaults/bounds, timeout ordering, unknown `DB_*` keys, and PgBouncer
  enum are table-driven.
- The complete compatibility matrix is table-driven. Pin missing/blank/extra
  maintenance URL handling, secret non-return, distinct-URL enforcement when
  the main connection is transaction-pooled, `maintenancePoolMax` bounds, and
  rejection of a declared transaction-pooled maintenance channel. A
  `transaction + primary` configuration parses for ordinary traffic but is
  explicitly marked incapable of session-affine maintenance.
- Pin `off + primary + DB_POOL_MAX=1` as a valid ordinary configuration. L01
  must not infer that retention/maintenance is enabled or reject the config for
  lacking a second primary session; consumer activation and live capability are
  owned by L02/L03.
- Pin 103 boundaries: reserve 20 fails/21 passes; at reserve 21, planned 81
  passes/82 fails. Pin `ceil(10×20/100)=2`, `ceil(101×20/100)=21`, reserve
  `>= serverMax` rejection, and multiplication overflow rejection.
- Pin that adding one worker adds a complete primary pool and, in direct/session
  mode, a complete maintenance pool. Reject legacy fleet keys, a migration
  reserve below three, and any adapter/application-identity fixture whose
  runtime/worker counts differ from `parseDatabaseFleetConfig`.
- Importing the module performs no env mutation, DB import, timer, or I/O.

## Security Contract

- No endpoint; server infrastructure only.
- No change to auth/RBAC/CSRF/rate limiting or public-write anti-abuse.
- Strict env validation; errors expose key names/codes but never values or URL.

## Validation Commands

- `bunx vitest run tests/vitest/db/databaseConfig.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `git diff --check`

## Documentation Updates Required

No docs in this leaf; hand the exact env table to TASK-551-02-L02/10-L02.

## Quantified Acceptance

- 100% branch coverage for parser/budget failure modes in the targeted suite.
- Minimum reserved headroom is at least 20% unless an explicit lower safe value
  is justified by TASK-551-01 evidence.
- All durations and connection counts use the exact finite bounds above, and
  `totalProcessCount * poolMax + totalProcessCount * any dedicated maintenance
  pool + migration reserve` is strictly less
  than `server maximum - operational reserve`; equality is rejected.
- No parsed/config-error/log/snapshot value contains either database URL. Every
  configuration that enables a distinct maintenance pool budgets all of its
  per-process connections before startup.

## Workflow Dispatch Envelope

The finite `forbiddenPaths` list captures named current ownership conflicts.
The closed `allowlist` rejects every omitted path, including the broad foreign
categories described in the file-ownership contract.

```json
{
  "schema": "coderso.task551.workflow-dispatch@v1",
  "taskId": "TASK-551-02-L01",
  "parent": {
    "taskId": "TASK-551",
    "subtaskId": "TASK-551-02"
  },
  "allowlist": [
    "core/db/databaseConfig.ts",
    "tests/vitest/db/databaseConfig.test.ts"
  ],
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
    "core/db/schema.ts",
    "core/db/migrations/meta/_journal.json"
  ],
  "dependencies": ["TASK-551-01-L02:single"],
  "commands": [
    {
      "id": "database-config-test",
      "lane": "vitest",
      "environmentProfile": "none",
      "argv": ["bunx", "vitest", "run", "tests/vitest/db/databaseConfig.test.ts"],
      "positiveDiscovery": {
        "kind": "test-paths",
        "paths": ["tests/vitest/db/databaseConfig.test.ts"],
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
      "id": "diff-check",
      "lane": "tooling",
      "environmentProfile": "none",
      "argv": ["git", "diff", "--check"],
      "positiveDiscovery": { "kind": "not-applicable" }
    }
  ],
  "occurrences": [
    {
      "id": "single",
      "dependsOn": ["TASK-551-01-L02:single"],
      "commandIds": ["database-config-test", "core-lint-types", "core-lint", "diff-check"]
    }
  ]
}
```

## Dated Contract Corrections — 2026-09-25 (maintenance pool bounds for the 02-L02 R6 guard; append-only)

This section is append-only. It amends the contract above; where they disagree, this section wins.
The workflow dispatch envelope is unchanged (see C5).

### C1 — Verified current state (HEAD `9c5b6666`)

- `core/db/databaseConfig.ts:326` parses
  `parseBoundedInteger(env, "DB_MAINTENANCE_POOL_MAX", 2, 2, 4)`: default 2, minimum 2, maximum 4.
- `core/db/databaseConfig.ts:363-366` sets `sessionAffineMaintenanceCandidate` to
  `pgbouncerMode === "off" && poolMax >= 2` (`:365`) in `primary` mode, else to the maintenance-URL
  policy result.
- The field's doc comment at `core/db/databaseConfig.ts:79-80` says "pool capacity >= 2".
- `sessionAffineMaintenanceCandidate` has no consumer outside `core/db/databaseConfig.ts` and
  `tests/vitest/db/databaseConfig.test.ts`.
- The fleet budget (`core/db/databaseConfig.ts:334-338`) prices
  `maintenancePoolMax × totalProcessCount` only in `direct|session` mode. Primary mode prices no
  maintenance pool, so the default configuration (planned 13, available 82) is unchanged by C2.

### C2 — Decision (binding)

TASK-551-02-L02 re-open amendment R6 (R6.2, R6.5) needs three sessions in the active maintenance
channel: the probe owner, the independent verifier, and one control slot for
`pg_cancel_backend`/`pg_terminate_backend`. The control slot is additive; it never shares ordinary
headroom.

- `DB_MAINTENANCE_POOL_MAX`: default `3`, accepted bound integer `3..4`. The maximum stays 4.
- In `primary` mode, `sessionAffineMaintenanceCandidate` becomes
  `pgbouncerMode === "off" && poolMax >= 3`. The doc comment at `:79-80` says ">= 3".
- `off + primary + DB_POOL_MAX=1` stays a valid ordinary configuration. `DB_POOL_MAX` accepted bounds
  (`1..50`) do not change. `DB_POOL_MAX=2` stays valid for ordinary traffic, but it is no longer a
  session-affine candidate.
- The overflow ceiling comment at `core/db/databaseConfig.ts:182` (512 × 50 + 512 × 4 + 8 = 27,656)
  stays correct because the maximum is unchanged.
- No new error code. A value of `2` fails with the existing `database_env_value_out_of_range` code
  and key `DB_MAINTENANCE_POOL_MAX`.

Corrected environment row (replaces line 109):

| Key | Default | Accepted bound |
|---|---:|---:|
| `DB_MAINTENANCE_POOL_MAX` | `3` | integer `3..4`; budgeted only when maintenance mode is `direct|session`; three sessions = probe owner + verifier + one control slot (02-L02 R6) |

### C3 — Re-derived fleet connection budget

The formula at lines 146-156 is unchanged:
`planned = N × poolMax + (maintenanceMode === "primary" ? 0 : N × maintenancePoolMax) + migrationReserve`
with `N = runtimeProcessCount + workerProcessCount`, and strictly `planned < available`.

| Configuration | Before | After |
|---|---:|---:|
| Defaults (primary; pool 10; N 1; reserve 21 of 103) | planned 13 < 82 | planned 13 < 82 (unchanged) |
| `direct|session`, default maintenance pool, pool 10, N 1, 103/21 | 10 + 2 + 3 = 15 < 82 | 10 + 3 + 3 = 16 < 82 |
| `direct|session`, default maintenance pool, pool 10, 103/21, largest passing N | N 6: 75 < 82; N 7: 87 fails | N 6: 6 × 13 + 3 = 81 < 82 passes; N 7: 94 fails |
| Test fixture: `direct`, pool 4, server 14, reserve 3 (available 11), N 1 | 4 + 2 + 3 = 9 < 11 | 4 + 3 + 3 = 10 < 11 |
| Same fixture + one worker (N 2) | 8 + 4 + 3 = 15, fails | 8 + 6 + 3 = 17, fails |
| Test fixture: `session`, pool 4, server 14, reserve 3, N 1 | 9 < 11 | 10 < 11 |
| Same fixture + one worker (N 2) | 15, fails | 17, fails |

Per-process maintenance cost in `direct|session` mode rises from 2 to 3 connections by default.
Deployments that set `DB_MAINTENANCE_POOL_MAX` explicitly to 3 or 4 have an unchanged budget.
Deployments that set it explicitly to `2` now fail at parse time with the out-of-range code. Before
this correction, they would have failed closed later at the R6 startup probe with
`database_maintenance_session_unavailable`.

### C4 — Every pin and its new value

In the allowlist (this leaf edits them):

| Pin | Current | New |
|---|---|---|
| `core/db/databaseConfig.ts:326` default/minimum | `2, 2, 4` | `3, 3, 4` |
| `core/db/databaseConfig.ts:365` primary candidate | `poolMax >= 2` | `poolMax >= 3` |
| `core/db/databaseConfig.ts:79-80` doc comment | "pool capacity >= 2" | "pool capacity >= 3" |
| `tests/vitest/db/databaseConfig.test.ts:199` default | `toBe(2)` | `toBe(3)` |
| `:536` accepted loop | `[2, 3, 4]` | `[3, 4]` |
| `:550` below-minimum rejection | `"1"` | `"2"` (a `"1"` row may stay as an extra rejection) |
| `:560` above-maximum rejection | `"5"` | unchanged |
| `:679`, `:684`, `:685` direct single | `"2"`, "planned = 4 + 2*1 + 3 = 9 < 11", `toBe(2)` | `"3"`, "planned = 4 + 3*1 + 3 = 10 < 11", `toBe(3)` |
| `:690` direct + worker comment | "8 + 4 + 3 = 15 >= 11" | "8 + 6 + 3 = 17 >= 11" (still rejects) |
| `:707`, `:715`, `:720` session single | `"2"`, "1*4 + 1*2 + 3 = 9", `toBe(9)` | `"3"`, "1*4 + 1*3 + 3 = 10", `toBe(10)` |
| `:727` session + worker comment | "2*4 + 2*2 + 3 = 15 >= 11" | "2*4 + 2*3 + 3 = 17 >= 11" (still rejects) |
| `:849` test name | "capacity>=2" | "capacity>=3" |

New pins required in `tests/vitest/db/databaseConfig.test.ts`:

- Omitting `DB_MAINTENANCE_POOL_MAX` in `direct` mode (and in `session` mode) resolves to 3.
- Primary candidate boundary: `off + primary` with `DB_POOL_MAX=2` gives `false`; with
  `DB_POOL_MAX=3` it gives `true`. `DB_POOL_MAX=1` stays `false` (`:861-866` unchanged).
- Default-budget boundary in `direct` mode (pool 10, reserve 21 of 103, maintenance default 3):
  `CODERSO_RUNTIME_REPLICA_COUNT=6` passes at planned 81; `=7` fails with
  `database_connection_budget_invalid`.

Source-of-truth docs: `_docs/DATA_MODEL.md`, `_docs/ARCHITECTURE.md` and `docs/` have no
`DB_MAINTENANCE_POOL_MAX` or maintenance-pool row today. There is nothing to re-baseline there.
TASK-551-10-L02 owns the future env documentation.

Out of the allowlist (handoffs; this leaf does not edit them):

- `_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md:721` and
  `_docs/_TASKS/TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:218` say "pool max
  `2..4`". Both become `3..4` (orchestrator/owning-leaf correction).
- `tests/integration/server/task551DatabaseLifecycle.test.ts:551` (02-L02 owner) uses fixture
  `maintenancePoolMax: 2` and expects `assertDedicatedDatabaseSessionBudget({ lockOwners: 1,
  workSessions: 1, ordinaryHeadroom: 0 })` not to throw. Under R6.5 (`>= lockOwners + workSessions +
  1`) that requires 3. 02-L02 R6.6 does not list this re-baseline today, so 02-L02 must add it
  (fixture → 3).
- `tests/integration/runtime/retentionScheduler.test.ts:251` (`CHANNEL.direct`) and `:682`
  (`session`) (06-L03 owner) use fake configs with `maintenancePoolMax: 2`. Under R6.2 the affinity
  gate fails closed below 3, so both fixtures become `3` in the 06-L03 R1 re-baseline.

### C5 — TASK-548 handoff, land order, gates, envelope

- **TASK-548 handoff** (`_docs/_TASKS/TASK-548-01-L03-Assistant-Ingest-V2-And-Compatibility-Migration.md:1064-1067`,
  `:2040-2043`). Guide ingest uses two dedicated sessions (lock owner + one work/reconcile session)
  plus the R6 control slot. It requires `DB_MAINTENANCE_POOL_MAX >= 3` in `direct|session` mode
  (the new default and minimum satisfy it) and `DB_POOL_MAX >= 4` in `off + primary` mode.
  TASK-548 still validates only through `assertDedicatedDatabaseSessionBudget` and never
  re-implements the matrix.
- **Land order:** this correction (source + test pins in C4) lands BEFORE the 02-L02 R6 code in
  `core/db/client.ts` / `core/db/dedicatedDatabaseSession.ts`. Until it lands, 02-L02's fail-closed
  check is the only guard.
- **Gates (implementer, FAST):**
  - `./node_modules/.bin/eslint --max-warnings=0 core/db/databaseConfig.ts tests/vitest/db/databaseConfig.test.ts`;
  - airtight
    `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null node_modules/vitest/vitest.mjs run tests/vitest/db/databaseConfig.test.ts tests/vitest/db/databaseApplicationIdentity.test.ts`
    (the identity suite consumes `parseDatabaseFleetConfig` and must stay green);
  - `wc -l` on both files (the test file is 914 lines today and must stay at or under 1,000);
  - `git diff --check`.
  - The orchestrator runs `bun --cwd core lint:types`.
- **Envelope:** `core/db/databaseConfig.ts` and `tests/vitest/db/databaseConfig.test.ts` are already
  the complete `allowlist`. The `database-config-test` command already names the owning suite.
  The `json` fence is not edited.

### C6 — Superseded sentences (quoted)

- Line 109 (env table): "| `DB_MAINTENANCE_POOL_MAX` | `2` | integer `2..4`; budgeted only when
  maintenance mode is `direct|session` |"
  - Now default `3`, bound `3..4` (C2).
- Line 130 (compatibility matrix, `off + primary`): "session-affine maintenance is only a candidate
  when pool capacity is at least 2 and L02's live probe passes"
  - Now at least 3.
- Lines 143-145: "Explicit `direct|session` selection may still be probed during DB startup because
  it declares dedicated infrastructure and always budgets at least two maintenance sessions."
  - Now at least three maintenance sessions per process.
