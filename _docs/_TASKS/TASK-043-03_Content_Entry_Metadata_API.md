# TASK-043-03: Content Entry Metadata API + Validation
# FileName: TASK-043-03_Content_Entry_Metadata_API.md

**Priority:** High  
**Category:** Content / API  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-02  
**Status:** To Do

---

## Overview

Expose a dedicated metadata endpoint to update entry status, scheduling, tags, and SEO fields without forcing full entry data validation.

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
    "title": "...",
    "description": "...",
    "canonicalUrl": "...",
    "robots": "index,follow"
  }
}
```

### Response
Entry detail (same shape as `GET /content/:type/entries/:id`).

---

## Validation

Add schema to `core/server/validation/contentSchemas.ts`:

- `status`: enum string (draft|published|scheduled|archived)
- `scheduledAt`: optional ISO string
- `tags`: optional string array (max 20, max length 24 each)
- `seo`: optional object with string fields

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/server/validation/contentSchemas.ts` | Add `contentEntryMetadataSchema` |
| `core/server/routes/contentEntryRoutes.ts` | Add PATCH route, require `content:write` |
| `core/admin/services/entriesClient.ts` | Add `updateEntryMetadata()` |
| `tests/integration/routes/contentEntries.test.ts` | Add route registration test |
| `tests/unit/admin/entriesClient.test.ts` | Add metadata update test |

---

## Documentation Updates Required

- `_docs/CMS_API.md` add endpoint + response example.

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-api.md`

