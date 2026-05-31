# 1033 - Admin seed package command

Date: 2026-05-31
Version: Unreleased
Tasks: TASK-346

## Key Changes

### Developer Tooling

- Added root `db:seed:admin` command that sources `.env` and runs the existing
  `core/db/seed.ts` admin bootstrap flow.
- Documented the local workflow for running migrations, then seeding a bootstrap
  admin with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### Testing

- Extended package-script regression coverage to lock the new admin seed command.

## Validation

- Passed `bun test tests/unit/tools/packageScripts.test.ts`.
- Passed `bun --cwd core lint`, `bun --cwd core lint:types`, and
  `bun run lint:repo:types`.
