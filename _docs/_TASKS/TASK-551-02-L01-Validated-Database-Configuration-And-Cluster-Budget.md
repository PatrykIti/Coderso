# TASK-551-02-L01: Validated Database Configuration and Cluster Budget
# FileName: TASK-551-02-L01-Validated-Database-Configuration-And-Cluster-Budget.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure
**Estimated Effort:** Small
**Dependencies:** TASK-551-01-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Create a Bun-free strict configuration owner for pool size, cluster connection
budget, connect/idle/lifetime/query/lock/idle-in-transaction timeouts, and
PgBouncer mode. It must not import `db/client` or create network connections.

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
}>;

export function parseDatabaseRuntimeConfig(env: Readonly<Record<string, string | undefined>>) {
  const config = strictParseAndClamp(env);
  const planned = config.poolMax * config.replicas
    + config.workerConnectionReserve
    + config.migrationConnectionReserve;
  if (planned > config.serverMaxConnections - config.reservedConnections)
    throw new Error("database_connection_budget_invalid");
  return Object.freeze(config);
}
```

The exact accepted environment contract is:

| Key | Default | Accepted bound |
|---|---:|---:|
| `DB_POOL_MAX` | `10` | integer `1..50` |
| `DB_REPLICA_COUNT` | `1` | integer `1..64` |
| `DB_SERVER_MAX_CONNECTIONS` | `100` | integer `10..10_000` |
| `DB_RESERVED_CONNECTIONS` | `20` | integer `1..5_000`, and at least 20% of the server maximum unless TASK-551-01 evidence explicitly amends the contract |
| `DB_WORKER_CONNECTION_RESERVE` | `2` | integer `0..32` |
| `DB_MIGRATION_CONNECTION_RESERVE` | `1` | integer `1..8` |
| `DB_CONNECT_TIMEOUT_SECONDS` | `10` | integer `1..60` |
| `DB_IDLE_TIMEOUT_SECONDS` | `30` | integer `1..600` |
| `DB_MAX_LIFETIME_SECONDS` | `1800` | integer `60..86_400` |
| `DB_STATEMENT_TIMEOUT_MS` | `15_000` | integer `100..120_000` |
| `DB_LOCK_TIMEOUT_MS` | `5_000` | integer `50..30_000`, not greater than statement timeout |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | `30_000` | integer `1_000..120_000` |
| `DB_PGBOUNCER_MODE` | `off` | exact enum `off|transaction` |

`DATABASE_URL` remains the separately required secret consumed by L02 and is
never returned by this parser. Reject unknown `DB_*` keys owned by Coderso, but
do not reject unrelated process variables or standard `PG*` variables. Explicit
malformed/out-of-range values fail; they are never silently clamped. PgBouncer
transaction mode maps to postgres.js `prepare: false`. Non-integers, overflow,
negative values, unsafe timeout ordering, insufficient reserve, or zero
operational headroom fail with machine-readable codes.

## Testing Requirements

- Default single replica resolves to pool 10 without exceeding a 103-connection
  server ceiling.
- Multi-replica boundary, reserved headroom, numeric overflow, malformed values,
  exact defaults/bounds, timeout ordering, unknown `DB_*` keys, and PgBouncer
  enum are table-driven.
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
  `replicas * poolMax + worker reserve + migration reserve` fits below the
  server maximum after the operational reserve.
