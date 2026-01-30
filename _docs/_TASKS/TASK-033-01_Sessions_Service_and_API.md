# TASK-033-01: Sessions Service and API
# FileName: TASK-033-01_Sessions_Service_and_API.md

**Priority:** Medium  
**Category:** Admin/Security  
**Estimated Effort:** Medium  
**Dependencies:** TASK-004, TASK-020  
**Status:** To Do

---

## Overview

Expose session listing and revoke endpoints for Admin UI.

## Service API

Create `core/services/admin/sessionAdminService.ts`:
- `listActiveSessions(userId?: string)`
- `revokeSession(id)`
- `revokeAllForUser(userId)`

## Routes

Add `core/server/routes/sessionAdminRoutes.ts`:

- `GET /sessions`
- `POST /sessions/:id/revoke`
- `POST /sessions/revoke-all` (userId)

## Validation

Add `core/server/validation/sessionAdminSchemas.ts`:
- revoke payload schema

## Testing Requirements

- `tests/unit/admin/sessionAdminService.test.ts`
- `tests/integration/routes/sessions.test.ts`

## Documentation Updates Required

- `_docs/CMS_API.md` sessions endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-sessions-api.md`
