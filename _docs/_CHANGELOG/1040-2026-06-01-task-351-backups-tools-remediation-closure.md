# 1040 - TASK-351 Backups tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-351, TASK-351-01, TASK-351-02, TASK-351-03, TASK-351-04

## Key Changes

### Backups

- Made manual backup include options controlled, serialized, strictly
  validated, normalized in the service contract, and recorded in audit metadata
  as option keys only.
- Kept the v1 metadata-only external-worker architecture explicit: queued and
  running backups now explain that a worker/plugin owns artifact creation and
  restore execution.
- Added status-aware download and restore semantics with stable
  `mapBackupError` mappings for not-found, not-ready, unsupported restore,
  invalid artifact, invalid include, and invalid schedule states.
- Added `DELETE /backups/:id` plus confirmed UI delete for backup metadata rows,
  with audit logging and page refresh behavior that preserves pagination.
- Replaced placeholder table pagination with strict `page`, `limit`, `query`,
  `total`, `hasNext`, `hasPrevious`, and worker-health list metadata.
- Documented Backups as intentionally uncached in the admin cache contract
  because queue state, worker health, artifact readiness, and action
  availability are fast-changing operational state.

## Validation

- `bun test tests/integration/routes/backups.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/backups/backupService.test.ts`
- `bun run test:vitest -- tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused headless Chromium CDP proof for `/admin/backups`: temporary
  admin/role/session plus backup pagination fixtures, include request body
  `{"kind":"manual","include":["database","settings"]}`, external-worker
  queued copy, disabled restore/download labels, real delete of the created row,
  and zero browser console/page/network loading errors. Temporary fixtures were
  removed after the pass.
