# TASK-551-02: Pool, Timeouts, Lifecycle, and Query Telemetry
# FileName: TASK-551-02-Pool-Timeouts-Lifecycle-And-Query-Telemetry.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Database / Infrastructure / Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01 initial exact-set receipt and TASK-551-01-L02 complete
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace the unchecked `DB_POOL_MAX`-only client setup with validated cluster
budgets, bounded PostgreSQL timeouts, graceful lifecycle, PgBouncer-compatible
configuration, a live-proven session-affine maintenance channel, and redacted
query/pool telemetry.
One strict runtime/worker fleet declaration is shared by the connection budget,
per-process application identity, and migration adapter; a worker is a full
pool-owning process, never an unpriced reserve.

## Single-Writer Ownership and Collision Guards

| Leaf | Exact allowlist |
|---|---|
| TASK-551-02-L01 | `core/db/databaseConfig.ts`; `tests/vitest/db/databaseConfig.test.ts` |
| TASK-551-02-L02 | `core/db/client.ts`; `core/db/databaseLifecycle.ts`; `core/db/databaseApplicationIdentity.ts`; `core/db/queryFingerprintRegistry.ts`; `core/db/queryTelemetry.ts`; `core/server/runtimeLifecycle.ts`; `core/server/runtimeEntrypoint.ts`; `core/server/prod.ts`; `core/server/dev.ts`; `scripts/task-551-pg-stat-interval.ts`; `tests/vitest/db/databaseApplicationIdentity.test.ts`; `tests/vitest/db/queryFingerprintRegistry.test.ts`; `tests/integration/server/task551DatabaseLifecycle.test.ts`; `tests/integration/server/task551RuntimeEntrypoints.test.ts`; `tests/perf/database-pool-telemetry.test.ts`; `tests/perf/database-pg-stat-interval.test.ts` |

L02 is the sole TASK-551 writer of `core/db/client.ts`. Forbidden paths include
all schema/migration files, cache/Redis source reserved for 07/08, TASK-511
backup paths, TASK-517 public/entry paths, TASK-493 SEO paths, and all
task/changelog/workflow files. L02 emits the exact validated environment table
as a handoff artifact; TASK-551-10-L02 is the sole `.env.example` and prose writer.

## Sub-Tasks

- [ ] **TASK-551-02-L01** — Validated database configuration and cluster budget.
- [ ] **TASK-551-02-L02** — Pool lifecycle, timeouts, and sanitized telemetry.

## Land Order

L01 → L02. L02 integrates only the configuration API landed by L01.
L02 solely owns the pure production fingerprint registry, created from L01's
reviewed initial handoff. Telemetry imports it directly; final L01 read-verifies
its exact set and production imports no test artifact.
It exports exactly `registerRuntimeLifecycleParticipant`,
`startRuntimeLifecycle`, and `closeRuntimeLifecycle` from `runtimeLifecycle.ts`,
plus `DedicatedDatabaseSession`, `assertMaintenanceSessionAffinity()`, and
`withDedicatedDatabaseSession<T>(run)` from `client.ts`.
The dedicated handle is connection-affine and exposes tracked static execution,
same-connection transactions, liveness verification, and confirmed cancel plus
rollback/connection termination. Later retention work must use that one handle
for its advisory lock and every batch; it may not fall back to global DB
transactions.
L01 owns `parseDatabaseFleetConfig`; L02's pure database-application identity
imports that value instead of reparsing fleet counts. It emits
only `coderso:runtime:<replicaId>`, `coderso:worker:<replicaId>`,
`coderso:maintenance:<replicaId>`, or
`coderso:migration:<operationUuid>`; runtime/worker fleet counts are separate,
bounded, and default to the one-runtime/zero-worker local profile. TASK-551-05
imports the same pure fleet parser and name builder for adapter counts, its
three-connection rollout reserve, and `pg_stat_activity` drain proof; it never
imports the live client. Legacy `DB_REPLICA_COUNT` and
`DB_WORKER_CONNECTION_RESERVE` are rejected so declarations cannot drift.
`DB_MAINTENANCE_MODE=primary|direct|session` is strict. A transaction-pooled
main channel cannot supply a maintenance lease; enabled maintenance must use a
distinct direct or PgBouncer-session URL and pass the two-transaction,
independent-verifier advisory-lock/PID probe before traffic. Every dedicated
maintenance pool connection is included for every declared process and
neither URL may enter parsed output, logs, metrics, or errors.
Ordinary `primary` startup never probes an unused maintenance capability, so
`DB_POOL_MAX=1` remains valid for a scheduler-disabled small site. An enabled
session-affine consumer performs the probe and fails before listen if capacity
is below 2. Explicit `direct|session` modes are probed once during DB startup;
the lifecycle-scoped result is reused rather than physically probed twice.
Later cursor/cache/retention workers consume those names and never install
competing signal handlers. `prod.ts` remains the production mode adapter and
imports `httpServer.ts`, but `runtimeEntrypoint.ts` is the sole signal owner and
owns the shared awaited start/listen/signal/drain sequence; both
`prod.ts` and `dev.ts` delegate to it and contain no direct signal handlers.
That shared owner, not either adapter, applies the exact 10-second graceful HTTP
drain followed by awaited forced stop in production and development.
Registration is module-owned and happens before this start boundary: 03-L02's
`routes/index.ts` import registers the cursor-keyring participant, while later
08-L03 preserves that registration and adds cache, retention, and backup
participants from its sole `httpServer.ts` composition ownership; it must not
reopen either entrypoint or introduce another signal owner.

## Security Contract

- No route changes; telemetry is server/operations-only.
- Auth, RBAC, CSRF, rate limits, nonce/HMAC, and CAPTCHA remain unchanged.
- Strict bounded env parsing; invalid explicit values fail startup rather than
  silently expanding the connection or timeout budget.
- Metrics contain fingerprints/categories only, never SQL text with binds,
  connection URLs, credentials, PII, or driver error details.
- PostgreSQL application names contain only the closed process class and strict
  opaque replica/operation identity—never URLs, hosts, tenants, credentials, PII,
  or request values.

## Testing Requirements

- `bunx vitest run tests/vitest/db/databaseConfig.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551DatabaseLifecycle.test.ts`
- `bun test tests/integration/server/task551RuntimeEntrypoints.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pool-telemetry.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pg-stat-interval.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`

## Documentation Updates Required

L02 changes no shared docs or environment example. TASK-551-10-L02 consumes the
exact L01 table and owns `.env.example`, architecture, ORM, deployment, health,
and performance documentation.

## Acceptance Criteria

- Invalid/unsafe pool and timeout configurations fail deterministically.
- `off + primary + pool=1` starts ordinary DB lifecycle with zero maintenance
  probe. The same configuration fails only when a session-affine consumer is
  enabled; primary capacity 2 or a proven dedicated mode satisfies that gate.
- `(runtime count + worker count) × primary pool + every distinct maintenance
  pool + three-or-more migration/probe connections` is strictly below server
  capacity after operational reserve. Default is `1/0 × 10 + 3 = 13` planned
  against 82 available; underdeclared or mismatched fleet arrays fail.
- Shutdown closes the client once. Explicitly opted-in query families expose
  bounded fingerprint/duration/outcome/returned-row metrics; a separate pool
  probe exposes bounded reservation wait/saturation. Neither claims unavailable
  driver-wide row/wait data, and both are zero-secret. The exact bounded
  telemetry sink exposes deterministic `snapshot()`/`reset()` operations without
  retaining raw statements, binds, errors, or an unbounded event stream.
- The read-only interval tool emits named pre-decision/before/after
  `pg_stat_statements` deltas without resetting shared statistics. It requires
  unchanged stats-reset/server/snapshot identity, classifies application,
  migration, maintenance, external-diagnostic and unknown traffic separately,
  and excludes the last two classes from application prioritization.
- Cancellation-aware workers finish confirmed cancellation and rollback or
  reserved-backend termination within 4,500 ms, before the shared 5,000 ms
  participant deadline and before cache/database close; no work remains detached.
- Non-database close uses the 5-second participant ceiling. Database close is
  the explicit exception: it is awaited/cancellable for at most 10 seconds or
  the remaining shared 15-second absolute shutdown budget, with no outer
  5-second race and no detached client/socket teardown.
