# TASK-083-02: Backups API Routes
# FileName: TASK-083-02_Backups_API_Routes.md

**Priority:** Medium  
**Category:** CMS/Backups  
**Estimated Effort:** Medium  
**Dependencies:** TASK-083-01, TASK-020  
**Status:** To Do

---

## Overview

Expose backup endpoints for Admin UI.

## Routes

Add `core/server/routes/backupRoutes.ts`:

- `GET /backups`
- `POST /backups` (manual create)
- `POST /backups/:id/restore`
- `GET /backups/:id/download` (returns signed URL or placeholder path)
- `GET /backups/schedule`
- `PATCH /backups/schedule`

## Validation

`core/server/validation/backupSchemas.ts`:
- `createBackupSchema`
- `scheduleUpdateSchema`

## Testing Requirements

- `tests/integration/routes/backups.test.ts` registers endpoints.

## Documentation Updates Required

- `_docs/CMS_API.md` add backups endpoints with payloads.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-backups-api.md`
