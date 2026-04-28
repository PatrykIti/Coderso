# TASK-202-05-01: Content Type Draft Published Status Model and Migration
# FileName: TASK-202-05-01_Content_Type_Draft_Published_Status_Model_and_Migration.md

**Priority:** High
**Category:** CMS/Engine + DB + API
**Estimated Effort:** Medium
**Dependencies:** TASK-202-05
**Status:** Done (2026-04-23)

---

## Overview

Make the list badge and `Publish` button truthful. Current code hard-codes
`published` in `ContentTypeList.tsx:30-36`, and `core/db/schema.ts:646-653`
has no content type status column.

## Sub-Tasks

No child task files.

## Files to Change

- `core/db/schema.ts:646-653`
- `core/db/migrations/*`
- `core/db/migrations/meta/*_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `core/services/content/typeService.ts:12-99`
- `core/server/validation/contentSchemas.ts:1-20`
- `core/server/routes/contentTypeRoutes.ts:54-82`
- `core/admin/services/contentTypesClient.ts:26-40`
- `core/admin/ui/content-types/ContentTypeList.tsx:30-38`
- `core/admin/ui/content-types/ContentTypeTable.tsx:15-23`

## Security Contract

- Visibility: internal admin API and UI.
- Auth model: unchanged.
- RBAC:
  - `content:write` for status changes unless a separate `content:publish`
    permission already exists for this route family.
- CSRF: required for status mutation.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: status enum only: `draft`, `published`.
- Anti-abuse:
  - publish cannot bypass schema validation,
  - default status must be deterministic,
  - route errors are mapped, not raw DB errors.

## Testing Requirements

- Migration artifacts exist and are synced.
- Create defaults to `draft` or the explicitly chosen product default.
- List/detail return status.
- Update rejects unknown status.
- Existing rows migrate deterministically.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Content type status is persisted instead of hard-coded.
2. Status is validated and returned by list/detail APIs.
3. DB migration artifacts are complete.
