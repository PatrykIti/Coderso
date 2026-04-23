# TASK-202-03-01: Content Type Delete Service Guard, Route Mapping, and Cache Invalidation
# FileName: TASK-202-03-01_Content_Type_Delete_Service_Guard_Route_Mapping_and_Cache_Invalidation.md

**Priority:** High
**Category:** CMS/Engine + API + Security
**Estimated Effort:** Medium
**Dependencies:** TASK-202-03
**Status:** To Do

---

## Overview

Make content type deletion safe before exposing it broadly in UI. Current
`typeService.ts:101-108` deletes directly, while the list query already has
`entryCount` data in `typeService.ts:24-48` that can support a zero-entry guard.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/content/typeService.ts:24-108`
  - add `content_type_has_entries` guard,
  - add dependency guards for existing owner references that would cascade or
    orphan data,
  - keep `content_type_not_found` machine-readable.
- `core/db/schema.ts:655-689`
  - account for `custom_screens.content_type_id` and
    `content_entries.type_id` cascade behavior before delete.
- `core/db/schema.ts:813-829`
  - account for `content_taxonomies.type_id` references.
- existing settings/listing owner helpers if the type is referenced by
  `site.contentRoutes`, listing queries/templates, or another current read model.
- `core/server/routes/contentTypeRoutes.ts:34-92`
  - add `mapContentTypeError`,
  - map not found/conflict/invalid errors to `ApiError`.
- `core/admin/services/contentTypesClient.ts:184-198`
  - keep list/detail cache invalidation on successful delete only.
- `tests/integration/routes/contentTypes.test.ts`
- DB-backed service test file if one exists or is added for `typeService`.

## Security Contract

- Visibility: internal admin API only.
- Auth model: unchanged admin session/API key.
- RBAC: `content:write`.
- CSRF: required.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: DELETE remains id-only unless a later explicit
  confirmation payload is introduced.
- Anti-abuse:
  - block delete while entries exist,
  - block delete while custom screens, taxonomies, content routes, listings, or
    other known owner references still depend on the type,
  - do not rely on client-side entryCount as authority,
  - return mapped conflict instead of raw DB/cascade errors.

## Testing Requirements

- Route registration still includes `DELETE /content-types/:id`.
- Deleting a missing id maps to 404.
- Deleting a type with entries maps to conflict.
- Deleting a type with custom screens or taxonomies maps to conflict.
- Any referenced settings/listing owner that cannot be checked here gets a named
  owner note and follow-up before the delete UI is considered complete.
- Deleting a zero-entry type invalidates content type caches.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Server-side delete cannot cascade-delete entries or custom screens silently.
2. Known domain errors are mapped at the route boundary.
3. Client cache is invalidated only after successful deletion.
