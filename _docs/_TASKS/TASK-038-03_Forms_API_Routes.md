# TASK-038-03: Forms API Routes
# FileName: TASK-038-03_Forms_API_Routes.md

**Priority:** Medium  
**Category:** CMS/Forms  
**Estimated Effort:** Medium  
**Dependencies:** TASK-038-02, TASK-004-06  
**Status:** Done (2026-01-31)

---

## Overview

Expose REST endpoints for form CRUD, fields, and submissions.

## Endpoints

- `GET /api/forms`
- `POST /api/forms`
- `GET /api/forms/:id`
- `PATCH /api/forms/:id`
- `DELETE /api/forms/:id`
- `GET /api/forms/:id/fields`
- `PUT /api/forms/:id/fields`
- `GET /api/forms/:id/submissions`
- `POST /api/forms/:id/submissions` (public submit)

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/formsRoutes.ts` | handlers + validation |
| `core/server/routes/index.ts` | register routes |
| `tests/integration/routes/forms.test.ts` | route wiring |

## Notes

- Admin endpoints require auth + permission `forms:write`.
- Public submission endpoint must validate CSRF and rate limit.

## Documentation Updates Required

- `_docs/CMS_API.md` (forms routes + payloads).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-forms-api.md`
