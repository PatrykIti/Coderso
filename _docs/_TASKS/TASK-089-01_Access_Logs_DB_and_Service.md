# TASK-089-01: Access Logs DB and Service
# FileName: TASK-089-01_Access_Logs_DB_and_Service.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

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

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-access-logs-schema.md`
