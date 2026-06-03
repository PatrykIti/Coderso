# 1040 - TASK-351 Backups tools remediation closure

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-351, TASK-351-01, TASK-351-02, TASK-351-03, TASK-351-04

## Key Changes

### Backups

- Made manual backup include options controlled, serialized, strictly
  validated, normalized in the service contract, and recorded in audit metadata
  as option keys only.
- Moved manual backup execution into the CMS process for v1: manual requests now
  produce a local JSON artifact, complete without an external worker, and keep
  restore explicitly unsupported until a restore contract exists.
- Added status-aware download and restore semantics with stable
  `mapBackupError` mappings for not-found, not-ready, unsupported restore,
  invalid artifact, invalid include, and invalid schedule states.
- Added `DELETE /backups/:id` plus confirmed UI delete for backup metadata rows,
  with audit logging and page refresh behavior that preserves pagination.
- Replaced placeholder table pagination with strict `page`, `limit`, `query`,
  `total`, `hasNext`, `hasPrevious`, and worker-health list metadata.
- Added Backups list and schedule admin cache hydration with cache-bus
  invalidation on create/delete/restore/schedule changes. Browser cache redacts
  local artifact paths to `artifactPath: "local"` and never stores downloaded
  backup content.

## Validation

- `bun test tests/integration/routes/backups.test.ts`
- `set -a && { [ ! -f .env ] || . ./.env; } && set +a && bun test tests/unit/backups/backupService.test.ts`
- `bun run test:vitest -- tests/vitest/admin/backupsClient.test.ts tests/vitest/ui/backups.test.tsx tests/vitest/ui/backups-page-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Focused headless Chromium CDP proof for `/admin/backups`: temporary
  admin/role/session plus backup pagination fixtures, include request body
  `{"kind":"manual","include":["database","settings"]}`, internal CMS artifact
  completion, local download with content, restore-disabled unsupported copy,
  real delete of the created row, and zero browser console/page/network loading
  errors. Temporary fixtures were removed after the pass.
- Final live Tools smoke confirmed UI-created backup status `complete`,
  `artifactPath: "local"`, redacted download path, JSON download content, and
  `backups:list:1:10:all` plus `backups:schedule` browser-cache keys.
