# TASK-002-04: Pages Admin API & Validation
# FileName: TASK-002-04_Pages_Admin_API.md

**Priority:** High  
**Category:** CMS/Pages  
**Estimated Effort:** Medium  
**Dependencies:** TASK-002-02, TASK-002-03, TASK-004-06  
**Status:** To Do  

---

## Overview

Expose admin API endpoints for pages, revisions, and preview. Includes validation schemas aligned with Page Builder data models and the current UI.

**UI Alignment:**
- `PageListPage` → `GET /pages`
- `PageCreateDrawer` → `POST /pages`
- `PageEditor` → `GET /pages/:id` + `PATCH /pages/:id`
- `PageRowActions` → `POST /pages/:id/preview`, `POST /pages/:id/publish`, `POST /pages/:id/unpublish`, `DELETE /pages/:id`
- `PageRowActions` duplicate (optional) → `POST /pages/:id/duplicate`

---

## Architecture

```
core/server/routes/pageRoutes.ts
core/server/validation/pageSchemas.ts
core/services/pages/*
```

---

## Endpoints

### List pages
`GET /pages`

Response:
```json
{
  "items": [
    {
      "id": "page_home",
      "title": "Homepage",
      "slug": "/",
      "status": "published",
      "author": { "id": "u_admin", "name": "Sarah Jenks" },
      "updatedAt": "2026-01-20T10:15:00Z"
    }
  ]
}
```

### Create page
`POST /pages`

Request:
```json
{
  "title": "About us",
  "slug": "/about",
  "template": "landing",
  "data": { "blocks": [] }
}
```

### Update page (draft)
`PATCH /pages/:id`

Request:
```json
{
  "title": "About us",
  "slug": "/about",
  "data": { "blocks": [ { "id": "blk1", "type": "hero", "data": {} } ] }
}
```

### Publish
`POST /pages/:id/publish`

### Unpublish
`POST /pages/:id/unpublish`

### Preview
`POST /pages/:id/preview`

Response:
```json
{
  "token": "pvw_...",
  "previewUrl": "https://example.com/preview?pageId=page_home&token=pvw_...",
  "expiresAt": "2026-01-28T14:00:00Z"
}
```

### Revisions
`GET /pages/:id/revisions`
`POST /pages/:id/revisions/:revisionId/restore`

### Duplicate (optional)
`POST /pages/:id/duplicate`

---

## Validation (JSON Schema)

`core/server/validation/pageSchemas.ts`

Key rules:
- `title`: required, non-empty
- `slug`: required, must start with `/`, unique
- `data.blocks`: array of objects with `id`, `type`, `layout`, `visibility`, `editor` (align with Page Builder)
- `data.seo`, `data.settings`: optional
- `additionalProperties: false` at root

Example schema snippet:
```ts
export const pageCreateSchema = {
  type: "object",
  required: ["title", "slug", "data"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", pattern: "^/" },
    template: { type: "string" },
    data: { $ref: "#/definitions/pageData" }
  }
};
```

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/routes/pageRoutes.ts` | add endpoints | list/create/update/publish/unpublish/preview/revisions |
| `core/server/validation/pageSchemas.ts` | add schemas | create/update validation |
| `core/services/pages/*` | wire services | via imports |

---

## Testing Requirements

### Integration
- `tests/integration/routes/pages.test.ts`
  - list pages returns array
  - create page validates payload
  - publish/unpublish changes status
  - preview returns token + expiry

### Unit (validation)
- `tests/unit/pages/validation.test.ts` (new)
  - rejects missing title
  - rejects unknown fields
  - accepts valid `data.blocks` payload

---

## Documentation Updates Required

- `_docs/CMS_API.md` (new endpoints)
- `_docs/PAGE_MODEL.md` (schema definition)

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-pages-revisions-preview.md`
