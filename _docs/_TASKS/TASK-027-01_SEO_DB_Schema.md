# TASK-027-01: SEO DB Schema
# FileName: TASK-027-01_SEO_DB_Schema.md

**Priority:** High  
**Category:** CMS/SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** To Do

---

## Overview

Add tables for storing SEO metadata and audit results for pages and entries.

## DB Model

Add `seo_documents` (core metadata + last audit summary).

Suggested columns:
- `id` (uuid, pk)
- `targetType` ("page" | "entry")
- `targetId` (uuid)
- `slug` (text, optional for quick filtering)
- `title` (text, nullable)
- `description` (text, nullable)
- `canonicalUrl` (text, nullable)
- `robots` (text, nullable)
- `score` (int, nullable)
- `status` ("ok" | "warning" | "issue")
- `issues` (jsonb array)
- `lastAuditAt` (timestamp)
- `createdAt`, `updatedAt`

Indexes:
- `(targetType, targetId)` unique
- `score` index (for filtering)
- `updatedAt` index

## Implementation Checklist

| File | What to Add |
| --- | --- |
| `core/db/schema.ts` | `seoDocuments` table |
| `core/db/migrations/` | new migration for table + indexes |
| `core/db/migrations/meta/*` | updated snapshots |

## Testing Requirements

- `tests/unit/seo/seoSchema.test.ts` (new): verify insert/update constraints.

## Documentation Updates Required

- `_docs/CMS_API.md` update model reference (schema).

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-seo-schema.md`
