# 1094 - Docker startup migrations

Date: 2026-06-04
Version: Unreleased
Tasks: TASK-400

## Key Changes

### Docker / Runtime

- Changed the production Docker `CMD` to start through
  `core/server/dockerStart.ts`.
- Added startup migration orchestration that runs Drizzle migrations from
  `core/db/migrations` before importing the main production HTTP server.
- Startup migrations are enabled by default and can be disabled with
  `CODERSO_RUN_MIGRATIONS_ON_START=false` when a deployment runs migrations as a
  separate release job.

### Database Safety

- Added a Postgres advisory lock around startup migrations so parallel replicas
  serialize the migration step instead of racing it.
- Startup migration failures are logged with direct `DATABASE_URL` values
  redacted and rethrown so the container exits before serving traffic.
- Added optional `CODERSO_MIGRATIONS_FOLDER` support for custom image layouts.

### Docs / QA

- Documented Docker startup migration behavior in architecture and release docs.
- Added Vitest coverage for startup migration policy, skip behavior, missing DB
  handling, redaction, injected migrator inputs, and lock acquire/release order.

## Validation

- `bun run test:vitest -- tests/vitest/server/startupMigrations.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `docker build -t coderso-docker-smoke:startup-migrations --build-arg APP_VERSION=0.0.0-startup-migrations -f Dockerfile .`
- `.env` DB smoke with `runStartupMigrations()` was attempted, but the local
  shell could not resolve the configured `DATABASE_URL` host
  (`getaddrinfo ENOTFOUND`) and no local DB container/network was available.
