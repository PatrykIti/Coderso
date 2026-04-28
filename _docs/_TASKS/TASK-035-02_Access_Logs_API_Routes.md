# TASK-035-02: Access Logs API Routes
# FileName: TASK-035-02_Access_Logs_API_Routes.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-035-01, TASK-020  
**Status:** Done (2026-01-31)

---

## Overview

Expose access log endpoints.

## Routes

Add `core/server/routes/accessLogRoutes.ts`:
- `GET /access-logs` (limit + filters)

## Validation

`core/server/validation/accessLogSchemas.ts`:
- `accessLogQuerySchema`

## Testing Requirements

- `tests/integration/routes/accessLogs.test.ts`

## Documentation Updates Required

- `_docs/CMS_API.md` add access logs endpoint.

## Changelog Entry

- `_docs/_CHANGELOG/090-2026-01-31-access-logs-core.md`
