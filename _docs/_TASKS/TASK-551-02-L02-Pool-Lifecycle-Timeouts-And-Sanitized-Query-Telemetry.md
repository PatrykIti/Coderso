# TASK-551-02-L02: Pool Lifecycle, Timeouts, and Sanitized Query Telemetry
# FileName: TASK-551-02-L02-Pool-Lifecycle-Timeouts-And-Sanitized-Query-Telemetry.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-02
**Priority:** High
**Category:** Database / Infrastructure / Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-02-L01
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Apply the validated config to postgres.js, set bounded session timeouts, expose
one idempotent lifecycle close path, and collect query-family/pool metrics
without leaking SQL binds or credentials.

## Sub-Tasks

None; this is an executable leaf.

## File Ownership

**Allowlist:** `core/db/client.ts`, `core/db/databaseLifecycle.ts`,
`core/db/queryTelemetry.ts`, `core/server/runtimeLifecycle.ts`,
`core/server/prod.ts`,
`tests/integration/database/clientLifecycle.test.ts`,
and `tests/perf/database-pool-telemetry.test.ts` only.

**Forbidden:** schema/migrations; service/route behavior; TASK-511 backup and
scheduler source; TASK-517 entry/public source; TASK-493 SEO source; cache/Redis
07/08 paths; task/changelog/workflow files.

## Implementation Pseudocode

```ts
const config = parseDatabaseRuntimeConfig(process.env);
const sqlClient = postgres(requireDatabaseUrlRedacted(), {
  max: config.poolMax,
  connect_timeout: config.connectTimeoutSeconds,
  idle_timeout: config.idleTimeoutSeconds,
  max_lifetime: config.maxLifetimeSeconds,
  prepare: config.pgbouncerMode !== "transaction",
  connection: {
    // postgres.js sends these startup parameters on every new physical session.
    statement_timeout: String(config.statementTimeoutMs),
    lock_timeout: String(config.lockTimeoutMs),
    idle_in_transaction_session_timeout: String(config.idleInTransactionTimeoutMs),
  },
});
export const db = drizzle(sqlClient, { schema });

type RuntimeLifecyclePhase = "database" | "cache" | "worker";
type RuntimeLifecycleParticipant = Readonly<{
  id: string;
  phase: RuntimeLifecyclePhase;
  start: () => Promise<void>;
  close: (reason: ShutdownReason) => Promise<void>;
}>;

registerRuntimeLifecycleParticipant({
  id: "database",
  phase: "database",
  start: async () => verifyDatabaseSessions(),
  close: async () => sqlClient.end({ timeout: config.connectTimeoutSeconds }),
});

// TASK-551-08-L03's httpServer composition registers every participant and
// validates the cursor keyring before prod invokes this start boundary.
await registerComposedHttpRuntimeParticipants();
await startRuntimeLifecycle();
const server = startHttpServer({ port }); // accept only after all starts resolve
server.stop(); // the one prod signal path stops acceptance first
await closeRuntimeLifecycle("sigterm"); // worker -> cache -> database

export type DedicatedDatabaseSession =
  Awaited<ReturnType<typeof sqlClient.reserve>>;

export async function withDedicatedDatabaseSession<T>(
  run: (session: DedicatedDatabaseSession) => Promise<T>
): Promise<T> {
  const session = await reserveWithValidatedDeadline(sqlClient);
  try { return await run(session); }
  finally { await session.release(); }
}

export async function measureDatabaseQuery<T>(input: {
  family: QueryFamily;
  fingerprint: QueryFingerprint; // closed static ID from TASK-551-01 inventory
  run: () => Promise<T>;
  rowsReturned: (result: T) => number;
}): Promise<T> {
  // Measure wall duration/outcome around this opted-in operation, bucket the
  // supplied bounded result count, and never accept SQL text or bind values.
}

export async function probeDatabasePoolHealth(): Promise<PoolHealthSample> {
  // Independently time acquisition of one dedicated reserved session under a
  // validated deadline, bucket the wait/saturation outcome, release in finally.
}
```

Do not issue a one-off `SET` query: it would configure only one checked-out
session and leave the rest of the pool unbounded. The fixed-name startup
parameters above apply to every initial and replacement physical connection.
`registerRuntimeLifecycleParticipant`, `startRuntimeLifecycle`, and
`closeRuntimeLifecycle` are the only registry API. The separate
`client.ts` exports `DedicatedDatabaseSession` and
`withDedicatedDatabaseSession<T>(run)` as the only supported reserved-
connection boundary and is consumed by TASK-551-06-L03 for advisory-lock work.
The registry rejects
duplicate IDs/late registration, starts database → cache → worker exactly once,
rolls back already-started participants on failure, closes in reverse phase and
registration order, and memoizes concurrent close calls. `prod.ts` owns the one
production start/signal path: TASK-551-08-L03's `httpServer.ts` composition first
registers cache, retention, backup start/stop, and cursor-key startup work; then
`prod.ts` starts the registry, accepts HTTP traffic, stops acceptance on signal,
awaits the registry, and exits. TASK-551-06-L03 and TASK-551-08-L03 import these
exact APIs and may not add signal handlers. TASK-551-06-L03 does not own
`dockerStart.ts` or any HTTP/development composition file.

Known timeout/cancel/deadlock errors map to bounded categories. Raw driver
message, statement text, bind values, and `DATABASE_URL` never enter logs.
postgres.js does not expose reliable driver-wide per-query row counts or pool
wait for every Drizzle call, so this contract makes no such claim:
`measureDatabaseQuery` covers only explicitly opted-in optimized callers, while
`probeDatabasePoolHealth` separately measures bounded reserved-session wait and
saturation. Neither uses undocumented driver internals or the debug callback as
a completion hook. TASK-551-01's planned-delta inventory pins each opted-in
caller's closed `QueryFingerprint` and later owner leaf; those leaves import this
wrapper without editing `queryTelemetry.ts`. No caller-derived SQL, route value,
bind, URL, or free-form label may become a fingerprint.

## Testing Requirements

- Real DB reserves at least two simultaneous physical connections, verifies the
  three startup timeout settings on both, replaces one connection, verifies the
  replacement, and exercises a deliberately bounded timeout cancellation.
- Lifecycle tests register fake database/cache/worker participants, assert
  awaited start order and reverse close order, HTTP starts only after the
  registry and stops before close, rollback after partial start,
  duplicate/late-registration rejection, and concurrent SIGTERM/SIGINT/shutdown
  calls invoking each close exactly once.
- `measureDatabaseQuery` tests success/error/timeout and returned-row buckets for
  opted-in operations; the inventory/fingerprint set has exact coverage,
  cardinality remains fixed, and a secret sentinel cannot appear in metrics/log
  output.
- `probeDatabasePoolHealth` saturates only the test pool, records a bounded
  reservation-wait/saturation sample, releases every reserved session in
  `finally`, and returns to zero after drain. Tests do not claim this is
  driver-wide per-query wait telemetry.
- Dedicated-session tests prove success, thrown callback, acquisition timeout,
  and shutdown races release exactly once; L06-L03 imports the exact helper name.

## Security Contract

- No route changes; operations metrics stay internal.
- Existing auth/RBAC/CSRF/rate-limit and anti-abuse contracts are untouched.
- Env values are parsed by L01; URL is required but never echoed.
- Telemetry labels are allowlisted enums/fingerprints, not caller-controlled SQL.

## Validation Commands

- `set -a && source .env && set +a && bun test tests/integration/database/clientLifecycle.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pool-telemetry.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

Do not edit `.env.example`. Hand L01's exact env table and the lifecycle contract
to TASK-551-10-L02, which solely owns environment, ORM, performance, deployment,
health prose, and changelog 1263.

## Quantified Acceptance

- All configured timeouts are visible on every sampled initial/replacement
  physical connection and finite.
- Graceful shutdown completes within the configured ceiling: `prod.ts` stops
  the HTTP acceptor, then the registry closes workers/schedulers → cache/Redis
  → DB, exactly once per participant.
- Opted-in query telemetry has fixed label cardinality and bounded duration/
  outcome/returned-row buckets. The separate pool probe records bounded reserve
  wait/saturation; neither surface emits raw SQL binds, secrets, URLs, or PII.
