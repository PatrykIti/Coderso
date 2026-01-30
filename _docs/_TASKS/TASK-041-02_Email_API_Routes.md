# TASK-041-02: Email API Routes
# FileName: TASK-041-02_Email_API_Routes.md

**Priority:** Medium  
**Category:** Settings/Email  
**Estimated Effort:** Medium  
**Dependencies:** TASK-041-01, TASK-004-06  
**Status:** To Do

---

## Overview

Expose REST endpoints for email settings and test delivery.

## Endpoints

- `GET /api/settings/email`
- `PUT /api/settings/email`
- `POST /api/settings/email/test`
- `GET /api/settings/email/logs`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/emailSettingsRoutes.ts` | routes + validation |
| `core/server/routes/index.ts` | register |
| `tests/integration/routes/emailSettings.test.ts` | wiring |

## Notes

- Require `settings:write`.

## Documentation Updates Required

- `_docs/CMS_API.md` email settings routes.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-email-api.md`
