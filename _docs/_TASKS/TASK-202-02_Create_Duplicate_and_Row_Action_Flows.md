# TASK-202-02: Create, Duplicate, and Row Action Flows
# FileName: TASK-202-02_Create_Duplicate_and_Row_Action_Flows.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + Workflow
**Estimated Effort:** Large
**Dependencies:** TASK-202, TASK-202-01
**Status:** To Do

---

## Overview

Make content type creation and lifecycle actions feel complete without changing
the underlying Engine ownership model. This subtask covers
`_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` findings `BUG-1`, `BUG-2`, `BUG-6`, and
`UX-6` from the non-destructive workflow side.

Current code shows the gaps:

- `ContentTypeCreateDrawer.tsx:63-84` creates the type, closes the drawer, and
  calls `onCreated`, but does not navigate to the editor or show feedback.
- `ContentTypeTable.tsx:104-108` exposes only `Edit`.
- `contentTypesClient.ts:145-160` has create cache updates, but no duplicate
  helper or route.

## Sub-Tasks

- `TASK-202-02-01_Create_Drawer_Duplicate_Validation_and_Create_to_Editor_Flow.md`
- `TASK-202-02-02_Duplicate_Content_Type_Action_and_Clone_Contract.md`
- `TASK-202-02-03_Row_Action_Menu_and_Editor_Lifecycle_Entry_Points.md`

## Scope

- Validate duplicate names and slugs before create in the UI for quick feedback
  and in the existing `typeService`/route contract as the authoritative guard.
- Validate duplicate names and slugs on content type update as well. Editing an
  existing type may keep its own name/slug, but it must not collide with another
  type. This belongs in `typeService` and route error mapping, not only in the
  create drawer.
- On successful create, navigate to `/admin/coderso/engine/:id` through shared
  admin routing helpers and show creation feedback.
- Add a duplicate content type action that copies schema only, never entries,
  and creates a deterministic unique name/slug through the existing content type
  contract.
- Add list row and editor lifecycle entry points for Edit / Duplicate / Delete.
- Keep actual destructive delete behavior gated by `TASK-202-03`.

Out of scope:

- importing/exporting content type schema files,
- duplicating entries, taxonomies, custom screens, listings, or pages,
- creating a new API namespace for Engine actions when existing
  `/content-types*` can be extended safely.

## Files to Change

- `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx:36-162`
- `core/admin/ui/content-types/ContentTypeList.tsx:73-115`
- `core/admin/ui/content-types/ContentTypeTable.tsx:74-108`
- `core/admin/ui/content-types/ContentTypeEditor.tsx:318-382`
- `core/admin/services/contentTypesClient.ts:145-198`
- `core/services/content/typeService.ts:63-99`
  - authoritative duplicate name/slug guards for create and update, ignore-self
    update behavior, and duplicate clone contract.
- `core/server/routes/contentTypeRoutes.ts:54-92`
  - centralized `mapContentTypeError` coverage for duplicate create, update,
    and clone errors.
- `core/server/validation/contentSchemas.ts:1-20`
  - strict shape updates only when the duplicate endpoint/payload requires them.

## Security Contract

- Visibility: internal admin UI and `/admin/api/content-types*`.
- Auth model: unchanged admin session/API-key path.
- RBAC: `content:read` for relation/list lookups; `content:write` for create
  and duplicate.
- CSRF: required for create and duplicate mutations.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: duplicate route/input must reject extra fields.
- Anti-abuse:
  - duplicate action must not copy entries or secrets,
  - duplicate target name/slug must be explicit and unique,
  - duplicate create/update/clone errors come from domain error codes, not DB
    constraint strings or UI-only checks,
  - success feedback must not expose raw server errors.

## Testing Requirements

- Vitest:
  - create drawer duplicate validation and disabled/error states,
  - create success navigation to the new editor route,
  - duplicate action payload and cache invalidation,
  - row action menu accessible labels.
- Bun:
  - duplicate route registration and route behavior,
  - create duplicate name/slug returns mapped conflict/invalid errors from the
    server contract,
  - update duplicate name/slug returns mapped conflict/invalid errors while
    preserving same-record updates,
  - duplicate clone creates schema-only output with no entries.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` if cache behavior changes.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Creating a content type with a duplicate name or slug is blocked clearly.
2. Creating a valid content type takes the admin directly into its editor with
   visible feedback.
3. Duplicating a type creates a schema-only copy with unique name and slug.
