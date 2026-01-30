# TASK-029-01: Backups DB and Service
# FileName: TASK-029-01_Backups_DB_and_Service.md

**Priority:** Medium  
**Category:** CMS/Backups  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Add backup registry tables and a service to create/list/restore backups.

## DB Model

Add `backups` table with:
- `id` (uuid, pk)
- `status` ("queued" | "running" | "complete" | "failed")
- `kind` ("manual" | "scheduled")
- `storageDriver` ("local" | "s3" | "azure")
- `artifactPath` (text, nullable)
- `sizeBytes` (int, nullable)
- `createdAt`, `finishedAt`, `error`

Add `backup_schedules` table:
- `id` (uuid)
- `enabled` (bool)
- `frequency` ("daily" | "weekly" | "monthly")
- `retentionDays` (int)
- `storageDriver` + options (reference storage settings)
- `createdAt`, `updatedAt`

## Service API

`core/services/backups/backupService.ts`:
- `listBackups()`
- `createBackup(kind)`
- `markBackupComplete(id, artifactPath, sizeBytes)`
- `restoreBackup(id)`
- `getBackupSchedule() / setBackupSchedule()`

Note: v1 uses **metadata-only** backup record; actual backup file is created by future worker/plugin.

## Testing Requirements

- `tests/unit/backups/backupService.test.ts` CRUD + schedule.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` describe v1 backup strategy.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-backups-schema.md`
