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

## Dated Contract Corrections — 2026-09-26 (R8.9 step 0: dedicated-session bounds and fleet budget)

This section is append-only. It implements orchestrator decision D7 of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md` and the
TASK-551-02-L02 R8 decisions it points to. Where it disagrees with any earlier text of this file
(base contract or the 2026-09-25 section C1-C6), this section wins. The workflow dispatch envelope
(`json` fence) is unchanged. 02-L02 anchors are current on-disk line numbers of
`_docs/_TASKS/TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md`.

### S1 — Why C2-C5 are withdrawn

- C2-C4 existed only for 02-L02 R6 (in-pool probe owner, verifier and control slot). 02-L02 R7
  pivoted to one own `max: 1` client per dedicated session plus one separate control client
  (R7.3, R7.7 `:2356-2364`), and R8 closed the R7 audit (R8.5 `:2991-3032`).
- C2-C4 have NOT landed. `core/db/databaseConfig.ts:326` still reads `2, 2, 4`, `:365` still reads
  `poolMax >= 2`, and `:334-338` still prices maintenance only in `direct|session` (verified at
  HEAD `66203e22`). Nothing is reverted in source; the C4 pins are never applied.
- 02-L02 R8.9 (`:3176-3178`) placed a dispatch hold on C2-C4 and on the C5 land order. This note is
  land-order step 0 (R8.9 `:3244`; D3 (i)): it lands BEFORE any 02-L02 R7/R8 code is dispatched.

### S2 — Decision (binding; from 02-L02 R8.5 `:3003-3011` and R8.9 `:3180-3191`)

- `DB_MAINTENANCE_POOL_MAX` keeps its name and its `maintenancePoolMax` field. It is reinterpreted
  as the per-process dedicated-session cap `dedicatedSessionMax` (R7.5 `:2252`, R8.5 `:3003`).
- Default `3`; accepted bound integer `2..6`. `core/db/databaseConfig.ts:326` becomes
  `parseBoundedInteger(env, "DB_MAINTENANCE_POOL_MAX", 3, 2, 6)`. `1` and `7` fail with the existing
  `database_env_value_out_of_range` code and key `DB_MAINTENANCE_POOL_MAX`. No new error code.
- Fleet budget, in EVERY maintenance mode (`primary`, `direct`, `session`) and both PgBouncer
  modes:
  `planned = N × (poolMax + dedicatedSessionMax + 1) + migrationConnectionReserve`, with
  `N = runtimeProcessCount + workerProcessCount`, `dedicatedSessionMax = maintenancePoolMax`, and
  `+ 1` = the one transient control client per process (R7.7 `:2358-2361`). Strictly
  `planned < available`; equality fails; `reserved >= ceil(serverMax × 20 / 100)` is unchanged.
  Modes in which 02-L02 rejects dedicated sessions (`transaction + primary`, `session`) are still
  priced. This is deliberate: the budget is a static upper bound and never inspects capability.
- Overflow ceiling comment (`core/db/databaseConfig.ts:181-182`) and its mirrors in the test file:
  `512 × 50 + 512 × (6 + 1) + 8 = 25,600 + 3,584 + 8 = 29,192`, still far below
  `Number.MAX_SAFE_INTEGER`, so the `safeAdd`/`safeMultiply` guards stay pinned at the seam.
- `sessionAffineMaintenanceCandidate` is NOT changed: `:365` stays
  `pgbouncerMode === "off" && poolMax >= 2` and the doc comment at `:79-80` stays "pool capacity
  >= 2" (R8.9 `:3183`; no consumer reads the marker, C1 `:306-307`). The `session`-mode marker value
  (currently `true`, test rows `:822-838`) is not decided in this round; it stays as is.
- Process rule (R8.5 `:3010-3011`), documented here and in the env row: when retention scheduling
  and TASK-548 Guide ingest can run in one process, `DB_MAINTENANCE_POOL_MAX >= 3`. The default
  satisfies it. An operator-lowered `2` is valid for the budget; contention then resolves in 02-L02
  as a bounded `database_pool_reserve_timeout` (R8.5 `:3012-3015`).
- `session` maintenance mode still parses (a distinct non-blank `DB_MAINTENANCE_URL` stays
  required) and is still priced, but it is UNAVAILABLE for dedicated sessions: 02-L02 rejects it
  with `database_maintenance_session_unavailable` (R7.2 `:2019`, `:2023`).
- O1 (`DATABASE_DIRECT_URL` under `transaction + primary`, R7.2 `:2044-2046`) stays an open owner
  decision. This note does not change the `transaction + primary` row.

Corrected environment row (replaces line 109 and the C2 row at line 334):

| Key | Default | Accepted bound |
|---|---:|---:|
| `DB_MAINTENANCE_POOL_MAX` | `3` | integer `2..6`; per-process dedicated-session cap (`dedicatedSessionMax`, 02-L02 R7.7/R8.5); budgeted in every mode as `dedicatedSessionMax + 1` control connection per process; `>= 3` when retention scheduling and Guide ingest share a process |

Corrected compatibility matrix rows (replace lines 130, 132 and 133; line 131 is unchanged):

| Main mode | Maintenance mode | Result |
|---|---|---|
| `off` | `primary` | ordinary DB traffic is valid for `DB_POOL_MAX=1..50`; dedicated sessions use the 02-L02 R7.2 target (`DATABASE_DIRECT_URL` when set, else a verified non-pooled `DATABASE_URL`) and are proven per open by the 02-L02 key/pid startup check; the parse-time marker stays `poolMax >= 2` |
| either | `direct` | require a distinct `DB_MAINTENANCE_URL` that reaches PostgreSQL directly; 02-L02 accepts it only when verified non-pooled and opens one own `max: 1` client per dedicated session (no maintenance pool) |
| either | `session` | require a distinct non-blank `DB_MAINTENANCE_URL`; parses and is budgeted, but dedicated sessions are unavailable (`database_maintenance_session_unavailable`, 02-L02 R7.2) |

### S3 — Re-derived fleet connection budget (every value recomputed)

Available at the defaults is `103 − 21 = 82` (`databaseConfig.ts:274-282`).

| Configuration | Before (HEAD source) | After (S2) |
|---|---:|---:|
| Defaults (primary; pool 10; max 3; N 1; reserve 3) | `10 + 0 + 3 = 13 < 82` | `1 × (10 + 3 + 1) + 3 = 17 < 82` |
| Upper bounds, one process (pool 50, max 6) | primary `53 < 82` | `1 × (50 + 6 + 1) + 3 = 60 < 82` |
| Largest passing N at the defaults | primary: N 7 (`73`), N 8 fails (`83`) | any mode: N 5 (`5 × 14 + 3 = 73`), N 6 fails (`87`) |
| Worst-case overflow ceiling (N 512, pool 50, max at bound, reserve 8) | `27,656` | `29,192` |

Minimum usable `DB_SERVER_MAX_CONNECTIONS` at `DB_POOL_MAX=1`, `N = 1`, reserve 3 (an explicit
`DB_RESERVED_CONNECTIONS` below the default 21 is required at such sizes, as before):

| `DB_MAINTENANCE_POOL_MAX` | Planned | Before | After |
|---|---:|---|---|
| default (`3` after; unpriced `primary` before) | `1 × (1 + 3 + 1) + 3 = 8` | `10` (reserve 2: `4 < 8`) | `12` (reserve 3 = `ceil(2.4)`: `8 < 9`); `10` (reserve 2: `8 = 8`) and `11` (reserve 3 = `ceil(2.2)`: `8 = 8`) reject |
| explicit `2` | `1 × (1 + 2 + 1) + 3 = 7` | `10` | `10` (reserve 2: `7 < 8`), the parser's lower bound |

Operational consequence: at the default server budget one runtime process can now be joined by at
most four more runtime or worker processes (N 5, not 7). TASK-551-10-L02 documents it with the env
row (S6).

### S4 — Source change (land-order step 2; this leaf's allowlist only)

Lands at R8.9 step 2 (`:3246`), after the 02-L02 R7/R8 code (step 1), inside the unchanged
allowlist `core/db/databaseConfig.ts` + `tests/vitest/db/databaseConfig.test.ts`:

```ts
// core/db/databaseConfig.ts:326
const maintenancePoolMax = parseBoundedInteger(env, "DB_MAINTENANCE_POOL_MAX", 3, 2, 6);

// core/db/databaseConfig.ts:330-338 — one formula, no mode branch
// Cluster connection budget. Every runtime and worker process owns one primary pool,
// up to `maintenancePoolMax` dedicated sessions (02-L02 own clients) and one transient
// control client, in every maintenance mode, plus the migration reserve (one
// advisory-lock session plus two visibility probes, hence >= 3).
const minimumReserved = Math.ceil((serverMaxConnections * 20) / 100);
const primaryPools = safeMultiply(poolMax, fleet.totalProcessCount);
const dedicatedSessions = safeMultiply(safeAdd(maintenancePoolMax, 1), fleet.totalProcessCount);
const planned = safeAdd(safeAdd(primaryPools, dedicatedSessions), migrationConnectionReserve);
// unchanged: available, the reject condition and its error code/key.
```

The `:181-182` comment becomes "512 x 50 primary pools + 512 x (6 + 1) dedicated sessions plus
control + 8 migration reserve = 29,192". `:365` and `:79-80` are not edited (S2). The exported
surface (`:903-913` of the test) is unchanged.

### S5 — Every forced re-baseline in `tests/vitest/db/databaseConfig.test.ts`

Each row was recomputed against the S2 formula (HEAD anchors). These are intended contract changes
named by D7, not weakenings; every rejection that existed still rejects unless the row says
otherwise, and every pass/fail boundary keeps an exact equality pin.

| Anchor | Old | New | Arithmetic |
|---|---|---|---|
| `:48` comment | "1*10 + 0 + 3 = 13, available 82" | "1*(10 + 3 + 1) + 3 = 17, available 82" | defaults |
| `:199` | `toBe(2)` | `toBe(3)` | new default |
| `:201` comment | "Planned = 1*10 + 0 + 3 = 13 < available 82." | "Planned = 1*(10 + 3 + 1) + 3 = 17 < available 82." | |
| `:203-205` | `poolMax * N + reserve`, `toBe(13)` | `N * (poolMax + maintenancePoolMax + 1) + reserve`, `toBe(17)` | `:206` `toBe(82)` and `:207` unchanged |
| `:231` bounds row `DB_SERVER_MAX_CONNECTIONS` `extraMin` | `{ DB_RESERVED_CONNECTIONS: "2", DB_POOL_MAX: "1" }` | add `DB_MAINTENANCE_POOL_MAX: "2"` | old input: `8 = 8` rejects; new: `7 < 8`, keeps the parser minimum `10` reachable. `:232` `extraMax` unchanged (`8 < 8,000`) |
| `:536` | `[2, 3, 4]` | `[2, 3, 4, 5, 6]` | direct at defaults, max 6: `20 < 82` |
| `:550` | `"1"` rejected | unchanged | below `2` |
| `:560` | `"5"` rejected | `"7"` rejected | above `6` |
| `:580-588` passing | N `"13"`, pool `"6"`: `13 × 6 + 3 = 81` | N `"13"`, pool `"2"`; expression `N * (poolMax + maintenancePoolMax + 1) + reserve`; `toBe(81)` | old input: `13 × (6 + 3 + 1) + 3 = 133` rejects; new: `13 × 6 + 3 = 81 < 82` |
| `:590-600` failing | N `"79"`, pool `"1"`: `79 × 1 + 3 = 82` | N `"13"`, pool `"2"`, `DB_MIGRATION_CONNECTION_RESERVE: "4"`; expression `N * (2 + 3 + 1) + 4` (`3` = the documented default cap; the parser throws, so it is not read back); `toBe(82)`; still `connectionBudgetInvalid` | old input: `79 × 5 + 3 = 398`, no longer an equality pin. At reserve 3 an equality is impossible: `N × (pool + max + 1) = 79` is prime and the factor is within `4..57`. Reserve 4 gives `13 × 6 + 4 = 82 = 82` |
| `:614-619` | `{ server "10", reserve "2", pool "1" }` passes | add `DB_MAINTENANCE_POOL_MAX: "2"`; `toBe(2)` unchanged | old input: `8 = 8` rejects; new: `7 < 8`. `:605-612` and `:621-634` unchanged (`101/21`: `17 < 80`) |
| `:657-661` base | server `"12"` | server `"15"` (reserve `3` = `ceil(3.0)`) | old input: `1 × (4 + 3 + 1) + 3 = 11 ≥ 9` rejects; new: `11 < 12` |
| `:662` comment | "planned = 1*4 + 0 + 3 = 7 < 9" | "planned = 1*(4 + 3 + 1) + 3 = 11 < 12" | |
| `:663` | `poolMax * N + reserve`, `toBe(7)` | `N * (poolMax + maintenancePoolMax + 1) + reserve`, `toBe(11)` | |
| `:665` comment, `:669` | "8 + 3 >= 9", server `"12"` | "2*(4 + 3 + 1) + 3 = 19 >= 12", server `"15"` | still rejects |
| `:675` comment | "Direct maintenance mode prices a full second pool per process." | "Every mode prices dedicatedSessionMax + 1 control connection per process." | |
| `:679`, `:685` | `"2"`, `toBe(2)` | unchanged (`2` is inside `2..6`; the C4 "→ 3" is withdrawn) | |
| `:684` comment | "planned = 4 + 2*1 + 3 = 9 < 11" | "planned = 1*(4 + 2 + 1) + 3 = 10 < 11" | still passes |
| `:690` comment | "planned = 8 + 4 + 3 = 15 >= 11 -> fails." | "planned = 2*(4 + 2 + 1) + 3 = 17 >= 11 -> fails." | still rejects |
| `:693-700` `primaryLarge` | comment "Primary mode never budgets a maintenance pool."; `{ max "4", pool "4", 14/3 }` parses, marker `true` | that fixture now expects `connectionBudgetInvalid`; a companion primary fixture with `DB_MAINTENANCE_POOL_MAX: "2"` parses and keeps `sessionAffineMaintenanceCandidate` `true`; comment "Primary mode prices dedicated sessions too." | old input: `1 × (4 + 4 + 1) + 3 = 12 ≥ 11` rejects; companion: `10 < 11`, marker `4 >= 2` |
| `:707` | `"2"` | unchanged | |
| `:715` comment | "planned = 1*4 + 1*2 + 3 = 9 < available 11." | "planned = 1*(4 + 2 + 1) + 3 = 10 < available 11." | still passes |
| `:716-720` | `poolMax * N + maintenancePoolMax + reserve`, `toBe(9)` | `N * (poolMax + maintenancePoolMax + 1) + reserve`, `toBe(10)` | |
| `:727-728` comment | "planned = 2*4 + 2*2 + 3 = 15 >= 11: the added worker prices a complete primary pool and a complete maintenance pool, so the budget rejects it." | "planned = 2*(4 + 2 + 1) + 3 = 17 >= 11: the added worker prices a complete primary pool plus its dedicated-session cap and control connection, so the budget rejects it." | still rejects |
| `:735` comment | "max 512 processes x 50 pools + 512 x 4 + 8" | "max 512 processes x 50 pools + 512 x (6 + 1) + 8" | stale, not failing |
| `:782-787` | "512 x 4 maintenance"; `safeMultiply(4, 512)` `2_048`; `safeAdd(25_600, 2_048)` `27_648`; `safeAdd(27_648, 8)` `27_656`; `27_656 < MAX_SAFE` | "512 x (6 + 1) dedicated sessions plus control"; `safeMultiply(7, 512)` `3_584`; `safeAdd(25_600, 3_584)` `29_184`; `safeAdd(29_184, 8)` `29_192`; `29_192 < MAX_SAFE` | stale, not failing; keeps the worst-case pin honest |

Verified unchanged (no re-baseline): `:224` pool bounds at the defaults (`1`: `8 < 82`; `50`:
`57 < 82`); `:245-250` migration reserve `8` (`22 < 82`); `:460-465` and `:482-513` direct/session
defaults (`17 < 82`); `:569-578` (reserve 20 fails on the floor, 21 passes at `17 < 82`); the
`:798-839` matrix rows; `:849` name "capacity>=2" (`:365` stays); `:861-866` (`8 < 82`, marker
`false`); `:873` (`24 < 82`).

New pins (same file):

- Bounds: default `3` (`:199`); `2` and `6` accepted, `1` and `7` rejected (`:536-564`).
- Minimum usable server at pool 1 with the default cap: `{ DB_POOL_MAX: "1",
  DB_SERVER_MAX_CONNECTIONS: "12", DB_RESERVED_CONNECTIONS: "3" }` parses (`8 < 9`); the same with
  `"11"` rejects `connectionBudgetInvalid` (`8 = 8`).
- Default-fleet boundary (replaces the withdrawn C4 direct-mode `6`/`7` pin, which would now read
  `6 × 14 + 3 = 87` and reject): defaults with `CODERSO_RUNTIME_REPLICA_COUNT: "5"` parse at
  `73`; `"6"` rejects at `87`.
- Every-mode pricing: the `primaryLarge` rejection above.

Line budget: the test file is 914 lines at HEAD; the re-baselines and new pins must keep it at or
under 1,000 physical lines.

### S6 — Handoffs, land order, gates

- **Out-of-allowlist handoffs (this leaf does not edit them):**
  - Parent `_docs/_TASKS/TASK-551_Scalable_Database_Query_And_Cache_Optimization.md:721` and
    `_docs/_TASKS/TASK-551-10-L02-Documentation-Runbooks-And-Family-Closure.md:218` ("pool max
    `2..4`") become "per-process dedicated-session cap `2..6`, default 3, priced in every mode as
    cap + 1 control"; 10-L02 also records the N 5 default-fleet limit and the pool-1 minimum (S3).
  - `tests/integration/server/task551DatabaseLifecycle.test.ts:551` keeps
    `maintenancePoolMax: 2` (02-L02 R7.8 `:2448-2449`; RD10 keeps `2`, R8.5 `:3006-3007`).
  - `tests/integration/runtime/retentionScheduler.test.ts:251` (`CHANNEL.direct`) keeps
    `maintenancePoolMax: 2` plus the `maintenanceUrl` placeholder (02-L02 R8.9 `:3156-3158`).
  - TASK-548-01-L03 adopts the 02-L02 R8.9 replacement wording (`:3203-3209`): `off + primary` and
    `direct` require `DB_MAINTENANCE_POOL_MAX >= 2` for the Guide shape (default 3; at least 3
    whenever retention scheduling runs in the same process) and `DB_POOL_MAX >= 1`;
    `transaction + primary` and `session` are unavailable. TASK-548 still validates only through
    `assertDedicatedDatabaseSessionBudget`.
- **Budget gap until step 2 lands:** the primary-mode fleet undercount is at most `N × 4`
  connections at the new defaults (3 sessions + 1 control, R8.9 `:3193-3194`). It must close
  before the combined gates.
- **Land order** (02-L02 R8.9 `:3242-3250` as amended by D3 (i)): 0. this note (docs), before any
  02-L02 R7/R8 code dispatch; 1. 02-L02 R7 + R8 code (with the D1 seam); 2. the S4/S5 source and
  test change in this leaf's allowlist; 3. 06-L02 R8-R13; 4. 06-L03 R1; 5. the combined gates;
  6. at least two post-auditors per scope.
- **Gates for step 2 (implementer, FAST):** unchanged from C5 (`:415-422`): eslint on both
  allowlisted files; the airtight Vitest run of `tests/vitest/db/databaseConfig.test.ts` plus
  `tests/vitest/db/databaseApplicationIdentity.test.ts`; `wc -l` on both files (test file
  `<= 1,000`); `git diff --check`. The orchestrator runs `bun --cwd core lint:types`.

### S7 — Superseded sentences (quoted; line = current anchor)

Base contract:

- Lines 80-82 (pseudocode, verbatim):

  ```text
      + (config.maintenanceMode === "primary"
        ? 0
        : safeMultiply(config.maintenancePoolMax, config.fleet.totalProcessCount))
  ```

  Now: `+ safeMultiply(config.maintenancePoolMax + 1, config.fleet.totalProcessCount)` in every mode
  (S2, S4).
- Line 130 (matrix, `off + primary`): "session-affine maintenance is only a candidate when pool
  capacity is at least 2 and L02's live probe passes". Now: the S2 matrix row (marker stays `>= 2`;
  availability is the 02-L02 per-open startup check).
- Line 132 (matrix, `direct`): "create a dedicated pool with prepared statements enabled". Now: one
  own `max: 1` client per dedicated session on a verified non-pooled URL (S2).
- Line 133 (matrix, `session`): "require a distinct `DB_MAINTENANCE_URL` that reaches PgBouncer in
  session-pooling mode; create a dedicated pool with `prepare:false`". Now: parses and is priced;
  dedicated sessions unavailable (S2).
- Lines 138-139: "Configuration validation is necessary but not sufficient: L02 owns the live
  session-affinity probe." Now: L02 owns the per-open key/pid startup check (02-L02 R7.2).
- Lines 148-150: "`planned = (runtimeProcessCount + workerProcessCount) * poolMax +
  (maintenanceMode === "primary" ? 0 : (runtimeProcessCount + workerProcessCount) *
  maintenancePoolMax) + migrationConnectionReserve`." Now: the S2 formula.
- Lines 151-152: "Every runtime and worker process owns one primary pool; every process also owns
  the distinct maintenance pool when that mode is selected." Now: every process owns one primary
  pool plus up to `dedicatedSessionMax` dedicated sessions and one control client, in every mode.
- Lines 160-163: "Default resolves to runtime/worker counts `1/0`, pool 10, primary maintenance,
  migration reserve 3, planned 13, minimum/reserved 21, and available 82 under the 103-connection
  ceiling." Now: planned 17 (dedicated-session cap 3); the other values stand.
- Lines 181-182: "Pin that adding one worker adds a complete primary pool and, in direct/session
  mode, a complete maintenance pool." Now: in every mode, a complete primary pool plus
  `dedicatedSessionMax + 1`.

2026-09-25 section (C1-C6):

- `:295`: "It amends the contract above; where they disagree, this section wins." Now this 2026-09-26
  section wins over C1-C6.
- `:314-317`: "TASK-551-02-L02 re-open amendment R6 (R6.2, R6.5) needs three sessions in the active
  maintenance channel: the probe owner, the independent verifier, and one control slot for
  `pg_cancel_backend`/`pg_terminate_backend`. The control slot is additive; it never shares ordinary
  headroom." Now: R7/R8 own clients; the control client is priced as `+ 1` per process (S2).
- `:319`: "`DB_MAINTENANCE_POOL_MAX`: default `3`, accepted bound integer `3..4`. The maximum stays
  4." Now: default `3`, bound `2..6` (S2).
- `:320-321`: "In `primary` mode, `sessionAffineMaintenanceCandidate` becomes `pgbouncerMode ===
  "off" && poolMax >= 3`. The doc comment at `:79-80` says ">= 3"." Now: `:365` and `:79-80` stay
  `>= 2` (S2).
- `:323-324`: "`DB_POOL_MAX=2` stays valid for ordinary traffic, but it is no longer a session-affine
  candidate." Now: it stays a candidate (`>= 2`).
- `:325-326`: "The overflow ceiling comment at `core/db/databaseConfig.ts:182` (512 × 50 + 512 × 4
  + 8 = 27,656) stays correct because the maximum is unchanged." Now: `29,192` (S2, S4).
- `:327-328`: "A value of `2` fails with the existing `database_env_value_out_of_range` code and key
  `DB_MAINTENANCE_POOL_MAX`." Now: `1` and `7` fail with that code and key; `2` is accepted.
- `:334` (C2 env row): "| `DB_MAINTENANCE_POOL_MAX` | `3` | integer `3..4`; budgeted only when
  maintenance mode is `direct|session`; three sessions = probe owner + verifier + one control slot
  (02-L02 R6) |". Now: the S2 row.
- `:338-340`: "The formula at lines 146-156 is unchanged: `planned = N × poolMax + (maintenanceMode
  === "primary" ? 0 : N × maintenancePoolMax) + migrationReserve` with `N = runtimeProcessCount +
  workerProcessCount`, and strictly `planned < available`." Now: the S2 formula; strict `<` stands.
- `:344-350` (C3 table rows, each quoted by its "After" cell): "planned 13 < 82 (unchanged)";
  "10 + 3 + 3 = 16 < 82"; "N 6: 6 × 13 + 3 = 81 < 82 passes; N 7: 94 fails"; "4 + 3 + 3 = 10 <
  11"; "8 + 6 + 3 = 17, fails"; "10 < 11"; "17, fails". Now: the S3 and S5 values.
- `:352-356`: "Per-process maintenance cost in `direct|session` mode rises from 2 to 3 connections
  by default. Deployments that set `DB_MAINTENANCE_POOL_MAX` explicitly to 3 or 4 have an unchanged
  budget. Deployments that set it explicitly to `2` now fail at parse time with the out-of-range
  code. Before this correction, they would have failed closed later at the R6 startup probe with
  `database_maintenance_session_unavailable`." Now: per-process cost is `cap + 1` in every mode;
  explicit `2` stays valid (S2, S3).
- `:364-375` (C4 pin table, every row, verbatim). Now: the S5 table only (`:199` `toBe(3)` is
  kept by S5; every other row is withdrawn):

  ```text
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
  ```

- `:379`: "Omitting `DB_MAINTENANCE_POOL_MAX` in `direct` mode (and in `session` mode) resolves to
  3." Now: covered by `:199` (the default is mode-independent); no separate pin required.
- `:380-381`: "Primary candidate boundary: `off + primary` with `DB_POOL_MAX=2` gives `false`; with
  `DB_POOL_MAX=3` it gives `true`." Now: withdrawn (`>= 2` stays).
- `:382-384`: "Default-budget boundary in `direct` mode (pool 10, reserve 21 of 103, maintenance
  default 3): `CODERSO_RUNTIME_REPLICA_COUNT=6` passes at planned 81; `=7` fails with
  `database_connection_budget_invalid`." Now: the S5 default-fleet boundary (5 passes at 73, 6
  fails at 87).
- `:393-394`: "Both become `3..4` (orchestrator/owning-leaf correction)." Now: `2..6` (S6).
- `:397-399`: "Under R6.5 (`>= lockOwners + workSessions + 1`) that requires 3. 02-L02 R6.6 does not
  list this re-baseline today, so 02-L02 must add it (fixture → 3)." Now: the fixture keeps `2`
  (S6).
- `:401-402`: "Under R6.2 the affinity gate fails closed below 3, so both fixtures become `3` in the
  06-L03 R1 re-baseline." Now: `CHANNEL.direct` keeps `2` (S6); the `session` fixture follows 02-L02
  R7.11/R8.9 (unavailable).
- `:407-409`: "Guide ingest uses two dedicated sessions (lock owner + one work/reconcile session)
  plus the R6 control slot. It requires `DB_MAINTENANCE_POOL_MAX >= 3` in `direct|session` mode (the
  new default and minimum satisfy it) and `DB_POOL_MAX >= 4` in `off + primary` mode." Now: the S6
  TASK-548 wording.
- `:412-414`: "**Land order:** this correction (source + test pins in C4) lands BEFORE the 02-L02
  R6 code in `core/db/client.ts` / `core/db/dedicatedDatabaseSession.ts`. Until it lands, 02-L02's
  fail-closed check is the only guard." Now: the S6 land order (this note is step 0 before any
  02-L02 R7/R8 code; the source change is step 2).
- `:431` (C6): "Now default `3`, bound `3..4` (C2)." Now: default `3`, bound `2..6` (S2).
- `:434` (C6): "Now at least 3." Now: the S2 `off + primary` row (marker `>= 2`).
- `:437` (C6): "Now at least three maintenance sessions per process." Now: explicit `direct`
  selection prices `dedicatedSessionMax + 1` per process like every mode; `session` is unavailable
  for dedicated sessions (S2).

Everything in C1-C6 and the base contract that is not quoted above stays binding (for example C4
`:386-388`, C5 `:415-425`).

## Dated Contract Corrections — 2026-09-26 (fix note after the note audit; append-only)

This section is append-only. It implements Addendum B3 / C5 (with A3 and B2) of
`_docs/_workflows/_smoke/task-551/audit-evidence/2026-09-26-r12-v5-r8-dispositions.md`. Where it
disagrees with the R8.9-step-0 section above (`:439-755`), this section wins. The `json` fence is
unchanged. 02-L02 anchors are on-disk lines of the 02-L02 task file at HEAD `420bb24a`.

### F1 — Land order re-pointed to 02-L02 R9.12 (`:3799-3807`)

- R9.12 replaces R8.9 `:3242-3250`. Binding order: 0. the dated note above (docs), before any
  02-L02 R7/R8/R9 code dispatch; 1. 02-L02 R7 + R8 + R9 code, including the R9.1 seam; 2. the
  S4/S5 source and test change of this leaf; 3. 06-L02 R8-R13; 4. 06-L03 R1 (with the R7.11
  re-point, the R8.9 flips and R9.9); 5. the combined gates; 6. at least two post-auditors per scope.
- Step 2 executor (Addendum A3): a 02-L01 implementer mandate, allowlist `core/db/databaseConfig.ts`
  + `tests/vitest/db/databaseConfig.test.ts`, dispatched only after step 1 has landed. Its FAST
  gates are the S6 list (C5 `:415-422`). `sessionAffineMaintenanceCandidate` for declared `session`
  mode stays unchanged (A3: recorded, not decided). The S2-S5 content is unchanged.

### F2 — Citation and cross-file corrections

- Anchor correction of this file's own citation (not a new supersession): S7 `:658` "Lines 138-139"
  reads "Lines 137-139"; the quoted sentence starts on `:137`. Quote and replacement are unchanged.
- 02-L02 R9.10 (`:3777`) "today's primary-mode minimum is `7`" is corrected to `10` by 02-L02 in its
  next note (Addendum B2; parser floor `databaseConfig.ts:275-281`). S3 already records `10`;
  10-L02 copies `10`, never `7`. This leaf does not edit 02-L02.

### Superseded sentences (quoted; line = current anchor)

- `:456-457` (S1): "This note is land-order step 0 (R8.9 `:3244`; D3 (i)): it lands BEFORE any
  02-L02 R7/R8 code is dispatched." Now: R9.12 step 0 (`:3801`), before any 02-L02 R7/R8/R9 code
  dispatch (F1).
- `:516-517` (S3): "Minimum usable `DB_SERVER_MAX_CONNECTIONS` at `DB_POOL_MAX=1`, `N = 1`, reserve 3
  (an explicit `DB_RESERVED_CONNECTIONS` below the default 21 is required at such sizes, as
  before):" Now: "... `N = 1`, migration reserve 3 ..."; "reserve 2/3" in the table cells means
  `DB_RESERVED_CONNECTIONS`. Every value stands.
- `:530-531` (S4): "Lands at R8.9 step 2 (`:3246`), after the 02-L02 R7/R8 code (step 1), inside the
  unchanged allowlist `core/db/databaseConfig.ts` + `tests/vitest/db/databaseConfig.test.ts`:" Now:
  lands at R9.12 step 2 (`:3803`), after the 02-L02 R7 + R8 + R9 code including the R9.1 seam
  (step 1), through the A3 mandate inside that same allowlist (F1).
- `:624-626` (S6): "**Budget gap until step 2 lands:** the primary-mode fleet undercount is at most
  `N × 4` connections at the new defaults (3 sessions + 1 control, R8.9 `:3193-3194`)." Now: until
  step 2 lands the primary-mode undercount is `N × (maintenancePoolMax + 1)` under the HEAD parser
  (`2..4`, default 2): `N × 3` at the default, at most `N × 5`. "It must close before the combined
  gates." stands.
- `:627-630` (S6): "**Land order** (02-L02 R8.9 `:3242-3250` as amended by D3 (i)): 0. this note
  (docs), before any 02-L02 R7/R8 code dispatch; 1. 02-L02 R7 + R8 code (with the D1 seam); 2. the
  S4/S5 source and test change in this leaf's allowlist; 3. 06-L02 R8-R13; 4. 06-L03 R1; 5. the
  combined gates; 6. at least two post-auditors per scope." Now: F1.
- Base `:139-142`, second sentence (starts on `:140`): "L03 gates enabled scheduler startup on it;
  therefore `off + primary + DB_POOL_MAX=1` starts a normal small-site process when the scheduler is
  disabled and fails before listen only when session-affine work is enabled." Now: dedicated
  sessions never use the primary pool; an enabled L03 start at `off + primary + DB_POOL_MAX=1`
  passes when the 02-L02 R7.2 target resolves (02-L02 R8.9 `:3120-3123`). The first sentence of
  that range ("Ordinary primary-mode DB startup does not run that consumer-specific probe.") stands.
- Base `:209-215` (Quantified Acceptance, two bullets): `:209-212` "All durations and connection
  counts use the exact finite bounds above, and `totalProcessCount * poolMax + totalProcessCount *
  any dedicated maintenance pool + migration reserve` is strictly less than `server maximum -
  operational reserve`; equality is rejected." and `:213-215` "No parsed/config-error/log/snapshot
  value contains either database URL. Every configuration that enables a distinct maintenance pool
  budgets all of its per-process connections before startup." Now: `totalProcessCount × (poolMax + dedicatedSessionMax + 1) +
  migration reserve` is strictly less than `server maximum − operational reserve` in every
  maintenance mode; equality is rejected. Every configuration budgets its per-process
  dedicated-session cap plus one control connection before startup. The exact-finite-bounds clause
  and the no-database-URL sentence stand.

Everything in the base contract, C1-C6 and the R8.9-step-0 section that is not quoted here stays
binding.
