# TASK-031-01: Redirects DB and Service
# FileName: TASK-031-01_Redirects_DB_and_Service.md

**Priority:** Medium  
**Category:** CMS/SEO  
**Estimated Effort:** Medium  
**Dependencies:** TASK-001  
**Status:** Done (2026-01-30)

---

## Overview

Add redirects table and CRUD service.

## DB Model

Add `redirects` table:
- `id` (uuid, pk)
- `fromPath` (text, unique)
- `toPath` (text)
- `statusCode` (int, 301/302/307/308)
- `enabled` (bool)
- `createdAt`, `updatedAt`

## Service API

`core/services/redirects/redirectService.ts`:
- `listRedirects()`
- `getRedirect(id)`
- `createRedirect(input)`
- `updateRedirect(id, input)`
- `deleteRedirect(id)`

## Testing Requirements

- `tests/unit/redirects/redirectService.test.ts` CRUD + validation.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` mention redirect support.

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-redirects-schema.md`
