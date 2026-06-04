# 1095 - DB runtime test idle timeout

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-401

## Key Changes

### Runtime Testing

- Added optional `idleTimeout` support to `startHttpServer` and pass-through to
  `Bun.serve`.
- Updated the DB-backed media delivery integration test to start its runtime
  server with a 30-second idle timeout, preventing Bun socket resets when
  database-backed settings/auth checks run slowly under the full Bun lane.

### Docs / QA

- Documented that selected DB-backed Bun runtime tests may raise server
  `idleTimeout` while keeping the test runner timeout unchanged.
- Re-ran the media delivery suite and the adjacent assistant public-site plus
  media delivery sequence with `.env` loaded.

## Validation

- `set -a && source .env && set +a && bun test --timeout=15000 tests/integration/server/mediaDeliveryAccess.test.ts`
- `set -a && source .env && set +a && bun test --timeout=15000 tests/integration/server/assistantHouseProjectsCatalogPublicSite.test.ts tests/integration/server/mediaDeliveryAccess.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`
