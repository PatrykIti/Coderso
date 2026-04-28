# TASK-040-03: Webhooks API Routes
# FileName: TASK-040-03_Webhooks_API_Routes.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-040-01, TASK-004-06  
**Status:** Done (2026-01-31)

---

## Overview

Expose REST endpoints for webhooks and delivery logs.

## Endpoints

- `GET /api/settings/webhooks`
- `POST /api/settings/webhooks`
- `PATCH /api/settings/webhooks/:id`
- `DELETE /api/settings/webhooks/:id`
- `GET /api/settings/webhooks/:id/deliveries`
- `POST /api/settings/webhooks/:id/test`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/webhooksRoutes.ts` | CRUD + test trigger |
| `core/server/routes/index.ts` | register |
| `tests/integration/routes/webhooks.test.ts` | wiring |

## Notes

- Require `settings:write`.
- Test endpoint triggers delivery for sample payload.

## Documentation Updates Required

- `_docs/CMS_API.md` webhooks routes.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-webhooks-api.md`
