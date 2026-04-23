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
The implementation must also account for existing non-admin delete owners so the
guard is not bypassed outside the route family.

## Sub-Tasks

No child task files.

## Files to Change

- `core/services/content/typeService.ts:24-108`
  - add `content_type_has_entries` guard,
  - add dependency guards for existing owner references that would cascade or
    orphan data,
  - keep the delete contract in this service as the owner for admin/API and
    assistant execution; do not introduce a second delete helper,
  - keep `content_type_not_found` machine-readable.
- `core/db/schema.ts:655-689`
  - account for `custom_screens.content_type_id` and
    `content_entries.type_id` cascade behavior before delete.
- `core/db/schema.ts:813-829`
  - account for `content_taxonomies.type_id` references.
- existing settings/listing owner helpers if the type is referenced by
  `site.contentRoutes`, listing queries/templates, or another current read model.
- `core/services/kits/solutionKitsInstallService.ts:2050-2213`
  - rollback currently deletes/restores content types directly; either route this
    path through the guarded delete/restore contract where feasible, or document
    solution-kit rollback as the owner with its responsibility and equivalent
    safety proof.
- `core/services/assistant/actionExecutorService.ts:2765-2776`
  - assistant `content-type.delete` already calls the injected
    `deleteContentType`; prove it inherits the guarded service behavior and does
    not grow a parallel assistant-only delete path.
- `core/server/routes/contentTypeRoutes.ts:34-92`
  - add `mapContentTypeError`,
  - map not found/conflict/invalid errors to `ApiError`.
- `core/admin/services/contentTypesClient.ts:184-198`
  - keep list/detail cache invalidation on successful delete only.
- `tests/integration/routes/contentTypes.test.ts`
- `tests/unit/content/typeService.test.ts`
  - DB-backed service owner coverage for delete guards and domain errors.
- `tests/unit/assistant/actionExecutorService.test.ts`
  - Bun-owned assistant executor coverage against the guarded dependency
    contract.
- `tests/unit/assistant/actionExecutorService.db.test.ts` if DB-backed assistant
  delete behavior changes.

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
  - do not leave solution-kit rollback or another existing direct writer as an
    undocumented unguarded delete bypass,
  - do not introduce a duplicate delete service for assistant execution; use the
    same existing owner seam or name the remaining responsibility explicitly,
  - do not rely on client-side entryCount as authority,
  - return mapped conflict instead of raw DB/cascade errors.

## Testing Requirements

- Route registration still includes `DELETE /content-types/:id`.
- Deleting a missing id maps to 404.
- Deleting a type with entries maps to conflict.
- Deleting a type with custom screens or taxonomies maps to conflict.
- Any referenced settings/listing owner that cannot be checked here gets a named
  owner note and follow-up before the delete UI is considered complete.
- Solution-kit rollback either uses the guarded delete/restore path or has
  targeted coverage proving why its scoped direct path is safe and owner-owned.
- Assistant `content-type.delete` execution is covered against the same guarded
  delete contract, including a blocked dependency/conflict path if the executor
  maps that error itself.
- Deleting a zero-entry type invalidates content type caches.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Server-side delete cannot cascade-delete entries or custom screens silently.
2. Known domain errors are mapped at the route boundary.
3. Existing direct content-type delete paths are either routed through the guard
   or named with owner responsibility and equivalent safety evidence.
4. Client cache is invalidated only after successful deletion.
