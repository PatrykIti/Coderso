# TASK-003-03: Content Services and Revisions
# FileName: TASK-003-03_Content_Services_and_Revisions.md

**Priority:** High  
**Category:** CMS/Content  
**Estimated Effort:** Large  
**Dependencies:** TASK-003-01, TASK-003-02  
**Status:** Done (2026-01-28)  

---

## Overview

Implement services for content types and entries, including publish/unpublish and revision history. These services are used by the REST API and admin UI.

## Required Services

### `core/services/content/typeService.ts`
- `listContentTypes()`
- `getContentType(id)`
- `getContentTypeBySlug(slug)`
- `createContentType(input)`
- `updateContentType(id, input)`
- `deleteContentType(id)`

### `core/services/content/entryService.ts`
- `listEntries(typeId, filters?)`
- `getEntry(id)`
- `createEntry(typeId, input)`
- `updateEntry(id, input)`
- `publishEntry(id, actorId)` -> sets `status` + `publishedAt` + revision
- `unpublishEntry(id)` -> sets `status=draft` + `publishedAt=null`
- `createEntryRevision(id, data, actorId)`
- `listEntryRevisions(id)`
- `restoreEntryRevision(revisionId)`

## Sub-Tasks

1. Implement type CRUD with slug uniqueness.
2. Implement entry CRUD with schema validation.
3. Implement publish/unpublish + revision tracking.
4. Add search-friendly filters (status, title, updated range).

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/services/content/typeService.ts` | CRUD for types | use `contentTypes` table |
| `core/services/content/entryService.ts` | CRUD for entries + revisions | use `contentEntries`, `contentRevisions` |
| `core/services/content/validation.ts` | reused validation helpers | from TASK-003-02 |
| `core/server/errors.ts` | map validation errors | consistent API errors |

## Mock Payloads

**Create content type**
```json
{
  "name": "FAQ",
  "slug": "faq",
  "schema": {
    "type": "object",
    "additionalProperties": false,
    "required": ["title"],
    "properties": {
      "title": {"type": "string"},
      "answer": {"type": "string"}
    }
  }
}
```

**Create entry**
```json
{
  "title": "Shipping",
  "slug": "shipping",
  "data": {"title": "Shipping", "answer": "..."}
}
```

## Testing Requirements

- `tests/unit/content/typeService.test.ts`
  - create/update/delete type
  - slug uniqueness

- `tests/unit/content/entryService.test.ts`
  - create/update entry
  - publish creates revision
  - restore revision
  - enforce slug uniqueness per type

## Documentation Updates Required

- `_docs/CMS_SPEC.md`
- `_docs/CONTENT_TYPES_SPEC.md`

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-content-types-engine.md`
