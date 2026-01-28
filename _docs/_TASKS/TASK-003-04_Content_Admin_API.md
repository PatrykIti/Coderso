# TASK-003-04: Content Admin API
# FileName: TASK-003-04_Content_Admin_API.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Medium  
**Dependencies:** TASK-003-03, TASK-004-06  
**Status:** To Do  

---

## Overview

Expose REST endpoints for content types and entries. All endpoints are admin-protected and use validation + RBAC guards.

## Endpoints

**Content Types**
- `GET /content-types`
- `POST /content-types`
- `GET /content-types/:id`
- `PATCH /content-types/:id`
- `DELETE /content-types/:id`

**Content Entries**
- `GET /content/:type/entries`
- `POST /content/:type/entries`
- `GET /content/:type/entries/:id`
- `PATCH /content/:type/entries/:id`
- `POST /content/:type/entries/:id/preview`
- `POST /content/:type/entries/:id/publish`
- `POST /content/:type/entries/:id/unpublish`

## Sub-Tasks

1. Implement routes for content types.
2. Implement routes for content entries.
3. Plug in validation schemas for create/update.
4. Require auth + permission checks for all endpoints.

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/contentTypeRoutes.ts` | register CRUD routes | use `requirePermission` |
| `core/server/routes/contentEntryRoutes.ts` | register entry routes | use `requirePermission` |
| `core/server/validation/contentSchemas.ts` | request validators | create/update payloads |
| `core/server/server.ts` | register routes | ensure mount order |
| `core/server/auth/permissions.ts` | add permissions | `content:read`, `content:write` |

## Response Shape (example)

```json
{
  "id": "entry_001",
  "typeId": "ct_blog",
  "title": "First Post",
  "slug": "first-post",
  "status": "draft",
  "data": {"title": "First Post", "body": "..."},
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z"
}
```

## Testing Requirements

- `tests/integration/routes/contentTypes.test.ts`
  - confirm all endpoints are registered
  - update assertions if new endpoints are added

- `tests/unit/content/typeService.test.ts`
- `tests/unit/content/entryService.test.ts`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
