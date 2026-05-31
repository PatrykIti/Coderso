# TASK-346: Admin Seed Package Command
# FileName: TASK-346_Admin_Seed_Package_Command.md

**Priority:** Medium
**Category:** Developer Tooling + Auth Bootstrap
**Estimated Effort:** Small
**Dependencies:** TASK-001
**Status:** Done (2026-05-31)

---

## Overview

Add a root package command for repeatedly seeding a bootstrap administrator into
an already migrated local or test database.

The existing seed implementation in `core/db/seed.ts` already owns the admin
role/user creation flow. This task exposes it through `package.json` so local
setup can use one documented command instead of remembering the script path.

## Sub-Tasks

- Add `db:seed:admin` to root `package.json` beside the other database commands.
- Source `.env` before executing the seed script so `DATABASE_URL`,
  `ADMIN_EMAIL`, and `ADMIN_PASSWORD` match the existing migration command
  behavior.
- Add package-script regression coverage for the new command.
- Document the command in local development setup docs.
- Update task board and changelog.

## Implementation Pseudocode

```json
{
  "scripts": {
    "db:seed:admin": "set -a; [ ! -f .env ] || . ./.env; set +a; bun core/db/seed.ts"
  }
}
```

Data flow:

- Shell exports values from `.env` when the file exists.
- `bun core/db/seed.ts` imports the existing DB client and admin seed logic.
- `seedAdmin()` reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`, ensures the `admin`
  role exists, creates the user when missing, and attaches the role
  idempotently.

Error handling:

- Missing `DATABASE_URL` still fails at the DB client boundary.
- Missing `ADMIN_EMAIL` or `ADMIN_PASSWORD` keeps the existing skip behavior.
- Existing admin user/role assignments remain non-duplicating.

## Security Contract

No API routes are added or changed.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unchanged; this is a local CLI bootstrap command, not a public
  write endpoint.
- Secret handling: credentials stay in process env and are not written to docs,
  cache, localStorage, or debug payloads.

## Testing Requirements

- `bun test tests/unit/tools/packageScripts.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint:repo:types`

## Documentation Updates Required

- `docs/develop/getting-started.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1033-2026-05-31-admin-seed-package-command.md`
- `_docs/_CHANGELOG/README.md`

## Completion Notes (2026-05-31)

- Root `package.json` now exposes `bun run db:seed:admin`.
- Local development docs explain running migrations first, then seeding the
  admin with `.env` credentials or inline one-off overrides.
- Validation passed:
  - `bun test tests/unit/tools/packageScripts.test.ts` (`1 pass`, `0 fail`)
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run lint:repo:types`
