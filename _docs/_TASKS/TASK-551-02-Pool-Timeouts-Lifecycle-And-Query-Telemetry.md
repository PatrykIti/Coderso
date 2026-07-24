# TASK-551-02: Pool, Timeouts, Lifecycle, and Query Telemetry
# FileName: TASK-551-02-Pool-Timeouts-Lifecycle-And-Query-Telemetry.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Database / Infrastructure / Observability
**Estimated Effort:** Medium
**Dependencies:** TASK-551-01 complete
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Replace the unchecked `DB_POOL_MAX`-only client setup with validated cluster
budgets, bounded PostgreSQL timeouts, graceful lifecycle, PgBouncer-compatible
configuration, and redacted query/pool telemetry.

## Single-Writer Ownership and Collision Guards

| Leaf | Exact allowlist |
|---|---|
| TASK-551-02-L01 | `core/db/databaseConfig.ts`; `tests/vitest/db/databaseConfig.test.ts` |
| TASK-551-02-L02 | `core/db/client.ts`; `core/db/databaseLifecycle.ts`; `core/db/queryTelemetry.ts`; `core/server/runtimeLifecycle.ts`; `core/server/prod.ts`; `tests/integration/database/clientLifecycle.test.ts`; `tests/perf/database-pool-telemetry.test.ts` |

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
It exports exactly `registerRuntimeLifecycleParticipant`,
`startRuntimeLifecycle`, and `closeRuntimeLifecycle`; later cache/retention
workers consume those names and never install competing signal handlers.

## Security Contract

- No route changes; telemetry is server/operations-only.
- Auth, RBAC, CSRF, rate limits, nonce/HMAC, and CAPTCHA remain unchanged.
- Strict bounded env parsing; invalid explicit values fail startup rather than
  silently expanding the connection or timeout budget.
- Metrics contain fingerprints/categories only, never SQL text with binds,
  connection URLs, credentials, PII, or driver error details.

## Testing Requirements

- `bunx vitest run tests/vitest/db/databaseConfig.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/database/clientLifecycle.test.ts`
- `set -a && source .env && set +a && bun test tests/perf/database-pool-telemetry.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso:perf`

## Documentation Updates Required

L02 changes no shared docs or environment example. TASK-551-10-L02 consumes the
exact L01 table and owns `.env.example`, architecture, ORM, deployment, health,
and performance documentation.

## Acceptance Criteria

- Invalid/unsafe pool and timeout configurations fail deterministically.
- `replicas × pool + worker/migration reserve` cannot exceed the configured
  server budget; default remains safe for one small-site process.
- Shutdown closes the client once; pool wait/saturation/latency/error metrics
  are bounded and zero-secret.
