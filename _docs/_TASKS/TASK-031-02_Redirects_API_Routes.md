# TASK-031-02: Redirects API Routes
# FileName: TASK-031-02_Redirects_API_Routes.md

**Priority:** Medium  
**Category:** CMS/SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-031-01, TASK-020  
**Status:** To Do

---

## Overview

Expose redirect endpoints for Admin UI.

## Routes

Add `core/server/routes/redirectRoutes.ts`:

- `GET /redirects`
- `POST /redirects`
- `PATCH /redirects/:id`
- `DELETE /redirects/:id`

## Validation

`core/server/validation/redirectSchemas.ts`:
- `redirectCreateSchema`
- `redirectUpdateSchema`

## Testing Requirements

- `tests/integration/routes/redirects.test.ts` registers endpoints.

## Documentation Updates Required

- `_docs/CMS_API.md` add redirects endpoints + payloads.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-redirects-api.md`
