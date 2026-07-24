# TASK-551-02-L01: Validated Database Configuration and Cluster Budget
# FileName: TASK-551-02-L01-Validated-Database-Configuration-And-Cluster-Budget.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure
**Estimated Effort:** Small
**Dependencies:** TASK-551-01 initial exact-set receipt and TASK-551-01-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a Bun-free strict configuration owner for pool size, cluster connection
budget, connect/idle/lifetime/query/lock/idle-in-transaction timeouts,
PgBouncer mode, and the session-affine maintenance connection contract. It must
not import `db/client` or create network connections.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/db/databaseConfig.ts` and
`tests/vitest/db/databaseConfig.test.ts` only.

**Forbidden:** `core/db/client.ts` (L02 owner), schema/migrations, route/service
source, cache/Redis paths, and all active TASK-511/517/493/518 paths.

## Implementation Pseudocode

```ts
type DatabaseRuntimeConfig = Readonly<{
  poolMax: number;
  replicas: number;
  serverMaxConnections: number;
  reservedConnections: number;
  workerConnectionReserve: number;
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

export function parseDatabaseRuntimeConfig(env: Readonly<Record<string, string | undefined>>) {
  const config = strictParseAndClamp(env);
  const minimumReserved = Math.ceil(config.serverMaxConnections * 20 / 100);
  const planned = config.poolMax * config.replicas
    + (config.maintenanceMode === "primary"
      ? 0
      : config.maintenancePoolMax * config.replicas)
    + config.workerConnectionReserve
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
| `DB_REPLICA_COUNT` | `1` | integer `1..64` |
| `DB_SERVER_MAX_CONNECTIONS` | `103` | integer `10..10_000` |
| `DB_RESERVED_CONNECTIONS` | `21` | integer `1..5_000`, less than server maximum and at least `ceil(server maximum × 20 / 100)` unless TASK-551-01 evidence explicitly amends the contract |
| `DB_WORKER_CONNECTION_RESERVE` | `2` | integer `0..32` |
| `DB_MIGRATION_CONNECTION_RESERVE` | `1` | integer `1..8` |
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
do not reject unrelated process variables or standard `PG*` variables. Explicit
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
`planned = replicas * poolMax + (maintenanceMode === "primary" ? 0 : replicas
* maintenancePoolMax) + workerReserve + migrationReserve`. Require
`reserved >= minimumReserved` and strictly `planned < available`; equality fails.

## Testing Requirements

- Default resolves to pool 10, primary maintenance, planned 13,
  minimum/reserved 21, and available 82
  under the 103-connection ceiling.
- Multi-replica boundary, reserved headroom, numeric overflow, malformed values,
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
  `replicas * poolMax + dedicated maintenance pools + worker reserve + migration reserve` is strictly less
  than `server maximum - operational reserve`; equality is rejected.
- No parsed/config-error/log/snapshot value contains either database URL. Every
  configuration that enables a distinct maintenance pool budgets all of its
  per-replica connections before startup.
