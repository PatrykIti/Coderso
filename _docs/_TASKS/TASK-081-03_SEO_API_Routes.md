# TASK-081-03: SEO API Routes
# FileName: TASK-081-03_SEO_API_Routes.md

**Priority:** High  
**Category:** CMS/SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-081-02, TASK-020  
**Status:** To Do

---

## Overview

Expose SEO manager endpoints for Admin UI.

## Routes

Add `core/server/routes/seoRoutes.ts` and register in `routes/index.ts`:

- `GET /seo` list all SEO documents  
- `GET /seo/:id` get one  
- `PATCH /seo/:id` update meta fields  
- `POST /seo/audit` run audit (all or a single target)

### Payload examples

`PATCH /seo/:id`
```json
{
  "title": "New meta title",
  "description": "Meta description...",
  "canonicalUrl": "https://example.com/about",
  "robots": "index,follow"
}
```

`POST /seo/audit`
```json
{ "targetType": "page", "targetId": "uuid" }
```

## Validation

Add schema in `core/server/validation/seoSchemas.ts`:
- `seoUpdateSchema`
- `seoAuditSchema`

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/server/routes/seoRoutes.ts` | CRUD + audit routes |
| `core/server/routes/index.ts` | register SEO routes |
| `core/server/validation/seoSchemas.ts` | request schemas |
| `tests/integration/routes/seo.test.ts` | routes registered |

## Documentation Updates Required

- `_docs/CMS_API.md` add SEO endpoints.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-api.md`
