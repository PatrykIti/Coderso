# TASK-043-02: Content Entry Metadata Services
# FileName: TASK-043-02_Content_Entry_Metadata_Services.md

**Priority:** High  
**Category:** Content / Services  
**Estimated Effort:** Medium  
**Dependencies:** TASK-043-01  
**Status:** To Do

---

## Overview

Extend entry services to expose metadata (tags, scheduling, author) and sync SEO data via `seo_documents`.

---

## Required API surface

### New/updated types
- `EntryStatus` should include: `draft | published | scheduled | archived`.
- `EntryDetail` should include:
  - `tags: string[]`
  - `scheduledAt?: Date | null`
  - `seo?: { title?: string | null; description?: string | null; canonicalUrl?: string | null; robots?: string | null }`
  - `author?: { id; name; email } | null`

### New function
- `updateEntryMetadata(entryId, input)`:
  - updates `status`, `scheduledAt`, `tags`
  - upserts SEO document for `targetType="entry"` with provided SEO fields
  - validates `status` value
  - if `status === "scheduled"`, require `scheduledAt`

### Update existing functions
- `getEntry()` should join `users` and fetch `seo_documents` for target entry.
- `listEntries()` should include `tags`, `scheduledAt`, `author` (already joins users; extend fields).

---

## Implementation Checklist

| File | Action |
| --- | --- |
| `core/services/content/entryService.ts` | Extend `EntryStatus`, `listEntries`, `getEntry`, add `updateEntryMetadata` |
| `core/services/seo/seoService.ts` | Use `upsertSeoDocument` (no new files) |

---

## Validation Rules

- `status` must be one of: `draft`, `published`, `scheduled`, `archived`.
- If `scheduled`, `scheduledAt` is required and must be a valid ISO timestamp.
- `tags` limited to array of strings, max length 24 per tag, max 20 tags.

---

## Testing Requirements

- Add unit tests for `updateEntryMetadata`:
  - updates tags + scheduledAt
  - persists SEO description in `seo_documents`
  - rejects invalid status / missing scheduledAt

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-entry-metadata-services.md`

