# TASK-043-03: Content Entry Metadata API + Validation
# FileName: TASK-043-03_Content_Entry_Metadata_API.md

**Priority:** High  
**Category:** Content / API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-02  
**Status:** Done (2026-01-31)

---

## Overview

Expose a dedicated metadata endpoint to update entry status, scheduling, tags, and SEO fields without forcing full entry `data` validation.

---

## API Contract

### Endpoint
`PATCH /content/:type/entries/:id/metadata`

### Payload
```json
{
  "status": "draft|published|scheduled|archived",
  "scheduledAt": "2026-02-01T10:00:00Z",
  "tags": ["tag-a", "tag-b"],
  "seo": {
    "title": "Entry title",
    "description": "Meta description",
    "canonicalUrl": "https://example.com/blog/entry",
    "robots": "index,follow"
  }
}
```

### Response
Entry detail (same shape as `GET /content/:type/entries/:id`, including `tags`, `scheduledAt`, `seo`).

---

## Validation Rules

Add `contentEntryMetadataSchema` to `core/server/validation/contentSchemas.ts`:

```ts
export const contentEntryMetadataSchema = {
  type: "object",
  properties: {
    status: { type: "string", enum: ["draft", "published", "scheduled", "archived"] },
    scheduledAt: { type: ["string", "null"], format: "date-time" },
    tags: {
      type: "array",
      maxItems: 20,
      items: { type: "string", minLength: 1, maxLength: 24 }
    },
    seo: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        canonicalUrl: { type: "string" },
        robots: { type: "string" }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
};
```

Service layer should also enforce:
- if `status === "scheduled"` then `scheduledAt` is required.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/validation/contentSchemas.ts` | add `contentEntryMetadataSchema` | uses `date-time` format |
| `core/server/routes/contentEntryRoutes.ts` | add PATCH `/metadata` | `content:write` permission |
| `core/admin/services/entriesClient.ts` | add `updateEntryMetadata()` | `{ withCsrf: true }` |
| `tests/integration/routes/contentEntries.test.ts` | ensure route registration | adjust if file name differs |
| `tests/unit/admin/entriesClient.test.ts` | verify metadata endpoint | |

---

## Route Behavior

- Must ensure `type` exists and entry belongs to type.
- Requires authenticated user for status transitions to `published`.
- Uses `updateEntryMetadata()` from services.
- Returns updated entry detail.

---

## Documentation Updates Required

- `_docs/CMS_API.md` add metadata endpoint + fields on entry detail.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-api.md`
