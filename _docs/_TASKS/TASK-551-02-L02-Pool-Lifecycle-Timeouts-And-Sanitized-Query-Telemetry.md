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

await startRuntimeLifecycle();
const server = startHttpServer({ port }); // accept only after database/cache/workers
server.stop(); // the one prod signal path stops acceptance first
await closeRuntimeLifecycle("sigterm"); // worker -> cache -> database

recordQueryMetric({ family, durationMs, outcome, rowsBucket, poolWaitBucket });
```

Do not issue a one-off `SET` query: it would configure only one checked-out
session and leave the rest of the pool unbounded. The fixed-name startup
parameters above apply to every initial and replacement physical connection.
`registerRuntimeLifecycleParticipant`, `startRuntimeLifecycle`, and
`closeRuntimeLifecycle` are the only lifecycle API. The registry rejects
duplicate IDs/late registration, starts database → cache → worker exactly once,
rolls back already-started participants on failure, closes in reverse phase and
registration order, and memoizes concurrent close calls. `prod.ts` owns the one
signal path: stop HTTP acceptance, await the registry, then exit. TASK-551-06-L03
and TASK-551-08-L03 import this exact API and may not add signal handlers.

Known timeout/cancel/deadlock errors map to bounded categories. Raw driver
message, statement text, bind values, and `DATABASE_URL` never enter logs.

## Regression-Test Shape

- Real DB reserves at least two simultaneous physical connections, verifies the
  three startup timeout settings on both, replaces one connection, verifies the
  replacement, and exercises a deliberately bounded timeout cancellation.
- Lifecycle tests register fake database/cache/worker participants, assert
  awaited start order and reverse close order, HTTP starts only after the
  registry and stops before close, rollback after partial start,
  duplicate/late-registration rejection, and concurrent SIGTERM/SIGINT/shutdown
  calls invoking each close exactly once.
- Telemetry cardinality remains fixed for arbitrary query/bind input; a secret
  sentinel cannot appear in metrics/log output.
- Pool saturation fixture produces a wait metric and returns to zero after drain.

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
- Telemetry has fixed label cardinality, records pool wait/saturation, and emits
  zero raw SQL binds, secrets, URLs, or PII in security sentinel tests.
