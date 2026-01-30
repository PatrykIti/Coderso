# TASK-042-02: Integrations API Routes
# FileName: TASK-042-02_Integrations_API_Routes.md

**Priority:** Medium  
**Category:** Settings/Integrations  
**Estimated Effort:** Medium  
**Dependencies:** TASK-042-01, TASK-004-06  
**Status:** To Do

---

## Overview

Expose REST endpoints for integrations.

## Endpoints

- `GET /api/settings/integrations`
- `GET /api/settings/integrations/:id`
- `PATCH /api/settings/integrations/:id`
- `POST /api/settings/integrations/requests`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/integrationsRoutes.ts` | routes + validation |
| `core/server/routes/index.ts` | register |
| `tests/integration/routes/integrations.test.ts` | wiring |

## Notes

- Require `settings:write` for updates.

## Documentation Updates Required

- `_docs/CMS_API.md` integrations routes.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-integrations-api.md`
