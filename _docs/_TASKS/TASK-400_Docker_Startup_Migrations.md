# TASK-400: Docker Startup Migrations
# FileName: TASK-400_Docker_Startup_Migrations.md

**Priority:** High
**Category:** Docker / Runtime / Database Migrations
**Estimated Effort:** Medium
**Dependencies:** TASK-399
**Status:** ✅ **Done** (2026-06-04)

---

## Overview

Run database migrations automatically before the main Coderso core application
starts from the production Docker image. The Docker runtime must fail fast when
migrations fail so operators do not serve a newer app against an older schema.

The behavior should be enabled by default for the Docker image and remain
explicitly disableable for orchestrators that already run migrations as a
separate release step.

## Architecture

Runtime startup gains a small orchestration layer:

```ts
// core/server/dockerStart.ts
await runStartupMigrations();
await import("./prod");
```

`runStartupMigrations` owns only startup migration policy and delegates the real
Drizzle migrator through a lazy adapter:

```ts
type StartupMigrationInput = {
  databaseUrl: string;
  migrationsFolder: string;
};

async function runStartupMigrations(options) {
  const decision = resolveStartupMigrationDecision(options.env);
  if (!decision.enabled) return { ran: false };

  const databaseUrl = options.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("startup_migrations_database_url_missing");

  await migrate({ databaseUrl, migrationsFolder });
  return { ran: true };
}
```

The lazy Drizzle adapter imports `postgres`, `drizzle-orm/postgres-js`, and
`drizzle-orm/postgres-js/migrator` only when migrations are enabled. This keeps
decision helpers import-safe for Vitest and avoids coupling tests to a live DB.

## Sub-Tasks

### TASK-400-01: Add Docker startup migration entrypoint

**Status:** ✅ Done (2026-06-04)

Implementation checklist:

| Layer | File | Change |
|-------|------|--------|
| Runtime | `core/server/startupMigrations.ts` | Add enabled-by-default migration policy, folder resolution, and Drizzle adapter |
| Runtime | `core/server/dockerStart.ts` | Run migrations before importing `server/prod.ts` |
| Docker | `Dockerfile` | Use the Docker startup script as the runtime `CMD` |
| Tests | `tests/vitest/server/startupMigrations.test.ts` | Cover enabled/default, opt-out, missing DB, success, and redaction |
| Docs | `_docs/ARCHITECTURE.md`, `_docs/RELEASE_PROCESS.md`, `tests/README.md` | Document startup migration behavior and validation lane |

Error handling:

- Missing `DATABASE_URL` while migrations are enabled throws
  `startup_migrations_database_url_missing` before HTTP starts.
- Migration failures are logged with any direct `DATABASE_URL` value redacted,
  then rethrown so the container exits non-zero.
- The Drizzle migrator runs behind a Postgres advisory lock so multiple
  startup replicas serialize migration execution.
- `CODERSO_RUN_MIGRATIONS_ON_START=false` skips migrations for deployments with
  a separate migration job.

Regression-test shape:

- Unit-test pure decision helpers without DB access.
- Inject a fake migration function into `runStartupMigrations` to prove
  ordering inputs and skip behavior without connecting to PostgreSQL.
- Assert failure logging redacts direct secret material.
- Assert startup migration locks are acquired before migration and released on
  both success and failure.

## Testing Requirements

- ✅ `bun run test:vitest -- tests/vitest/server/startupMigrations.test.ts`
- ✅ `bun --cwd core lint`
- ✅ `bun --cwd core lint:types`
- ✅ `docker build -t coderso-docker-smoke:startup-migrations --build-arg APP_VERSION=0.0.0-startup-migrations -f Dockerfile .`
- ⚠️ `.env` DB smoke attempted with `runStartupMigrations()`; local shell could
  not resolve the configured `DATABASE_URL` host (`getaddrinfo ENOTFOUND`) and
  no local DB container/network was available in `docker ps`.
- ✅ `bun run precommit`

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`: startup migration contract.
- `_docs/RELEASE_PROCESS.md`: Docker image startup behavior and opt-out env.
- `tests/README.md`: Vitest ownership for the startup migration policy helper.
- `_docs/_CHANGELOG/`: changelog entry after closure.
