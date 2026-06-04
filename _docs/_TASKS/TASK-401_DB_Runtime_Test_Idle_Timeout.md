# TASK-401: DB Runtime Test Idle Timeout
# FileName: TASK-401_DB_Runtime_Test_Idle_Timeout.md

**Priority:** Medium
**Category:** Runtime Testing / Bun Server Stability
**Estimated Effort:** Small
**Dependencies:** TASK-400
**Status:** ✅ **Done** (2026-06-04)

---

## Overview

Stabilize DB-backed Bun runtime tests that can spend more than Bun's default
10-second `Bun.serve` request idle timeout waiting on database-backed settings
or auth checks under full-lane load.

The observed failure was an `ECONNRESET` in
`tests/integration/server/mediaDeliveryAccess.test.ts` before the anonymous
media request could return the expected `401`.

## Architecture

`startHttpServer` now accepts an optional `idleTimeout`:

```ts
startHttpServer({
  port: 0,
  idleTimeout: 30,
});
```

The option is passed to `Bun.serve` through the shared server factory.
Production callers keep Bun's default behavior because they do not pass the
option. The DB-backed media integration test opts into a 30-second request idle
timeout to match the current runtime test lane timeout.

## Sub-Tasks

### TASK-401-01: Expose test server idleTimeout option

**Status:** ✅ Done (2026-06-04)

Implementation checklist:

| Layer | File | Change |
|-------|------|--------|
| Runtime | `core/server/httpServer.ts` | Add optional `idleTimeout` to `HttpServerOptions` and pass it to `Bun.serve` |
| Tests | `tests/integration/server/mediaDeliveryAccess.test.ts` | Start the DB-backed media runtime server with `idleTimeout: 30` |
| Docs | `tests/README.md`, `_docs/TESTING_STRATEGY.md` | Document the DB-backed runtime test timeout contract |

Regression-test shape:

- Re-run the media delivery access integration suite with `.env` loaded.
- Re-run the adjacent assistant public-site plus media delivery sequence that
  produced the reported timeout.
- Run core lint and typecheck for the touched runtime server contract.

## Testing Requirements

- ✅ `set -a && source .env && set +a && bun test --timeout=15000 tests/integration/server/mediaDeliveryAccess.test.ts`
- ✅ `set -a && source .env && set +a && bun test --timeout=15000 tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts tests/integration/server/mediaDeliveryAccess.test.ts`
- ✅ `bun --cwd core lint`
- ✅ `bun --cwd core lint:types`
- ✅ `bun run precommit`

## Documentation Updates Required

- `tests/README.md`: DB-backed runtime test idle-timeout note.
- `_docs/TESTING_STRATEGY.md`: clarify that selected Bun-owned DB/runtime
  servers may raise `Bun.serve` idle timeout while keeping the test runner
  timeout unchanged.
- `_docs/_CHANGELOG/`: changelog entry after closure.
