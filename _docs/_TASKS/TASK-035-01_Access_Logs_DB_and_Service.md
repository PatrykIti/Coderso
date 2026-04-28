# TASK-035-01: Access Logs DB and Service
# FileName: TASK-035-01_Access_Logs_DB_and_Service.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-31)

---

## Overview

Add access_logs table and service for recording/admin listing.

## DB Model

Add `access_logs`:
- `id` (uuid)
- `method` (text)
- `path` (text)
- `status` (int)
- `ip` (text)
- `userAgent` (text)
- `userId` (uuid, nullable)
- `durationMs` (int, nullable)
- `createdAt`

Indexes:
- `createdAt`
- `status`
- `path`

## Service API

`core/services/access/accessLogService.ts`:
- `logAccess(entry)`
- `listAccessLogs(limit, filters)`

## Middleware

Add middleware in `core/server/middleware/accessLog.ts` that records on response end.

## Testing Requirements

- `tests/unit/access/accessLogService.test.ts`

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` mention retention.

## Changelog Entry

- `_docs/_CHANGELOG/090-2026-01-31-access-logs-core.md`
