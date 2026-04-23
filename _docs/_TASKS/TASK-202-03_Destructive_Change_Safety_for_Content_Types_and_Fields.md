# TASK-202-03: Destructive Change Safety for Content Types and Fields
# FileName: TASK-202-03_Destructive_Change_Safety_for_Content_Types_and_Fields.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + API + Security
**Estimated Effort:** Large
**Dependencies:** TASK-202, TASK-202-02
**Status:** To Do

---

## Overview

Make destructive Engine operations deliberate, reversible where practical, and
server-guarded. This subtask covers `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`
findings `BUG-1` and `BUG-4`.

Current code shows the risks:

- `typeService.ts:101-108` deletes a content type directly.
- `contentTypeRoutes.ts:84-92` exposes the delete route without a centralized
  `mapContentTypeError` helper.
- `actionExecutorService.ts:2765-2776` executes assistant `content-type.delete`
  through the injected delete dependency; it must inherit the same guarded
  service contract and map dependency conflicts cleanly.
- `ContentTypeEditor.tsx:498-530` removes the selected field immediately.
- `FieldEditor.tsx:106-108` renders `Remove field` as a direct action.

## Sub-Tasks

- `TASK-202-03-01_Content_Type_Delete_Service_Guard_Route_Mapping_and_Cache_Invalidation.md`
- `TASK-202-03-02_Delete_Type_Danger_Zone_and_List_Confirmation_UI.md`
- `TASK-202-03-03_Field_Remove_Confirmation_Undo_and_Schema_Selection_Recovery.md`

## Scope

- Add a server-side content type delete guard.
- Block delete when entries or existing owner dependencies exist; if product
  later wants archive/force-delete, that must be a separate explicit contract.
- Scan the current dependency graph before allowing delete instead of relying on
  database cascades. At minimum cover `contentEntries`, `customScreens`,
  `contentTaxonomies`, and slug/id based settings/read models such as
  `site.contentRoutes` or listing owners when they reference the type.
- Identify every current content-type delete owner. Admin/API delete should use
  `typeService`; scoped existing owners such as solution-kit rollback must either
  call the same guarded contract or document their owner responsibility and
  equivalent safety proof.
- Keep assistant delete execution aligned with the same guarded contract; do not
  add an assistant-only delete helper or a weaker precheck that bypasses
  `typeService` domain errors.
- Map known domain errors to `ApiError` at the route boundary.
- Add delete confirmation UI on list/editor surfaces.
- Add field-removal confirmation and short recovery path.
- Keep schema dirty state and selected-field fallback deterministic after field
  removal.

Out of scope:

- hard-deleting entries as part of content type deletion,
- bulk cleanup of current duplicated data before the safe delete path ships,
- public delete endpoints,
- a schema migration engine for removed fields in existing entries.

## Files to Change

- `core/services/content/typeService.ts:24-108`
- `core/db/schema.ts:655-689`
  - verify current cascade references before defining delete safety.
- existing owner services/helpers for referenced settings/listings when the
  dependency is not owned by `typeService`.
- `core/server/routes/contentTypeRoutes.ts:34-92`
- `core/admin/services/contentTypesClient.ts:184-198`
- `core/services/assistant/actionExecutorService.ts:2765-2776`
  - verify assistant execution receives the same guarded delete behavior through
    its injected dependency and preserves machine-readable conflict handling.
- `core/admin/ui/content-types/ContentTypeTable.tsx:104-108`
- `core/admin/ui/content-types/ContentTypeEditor.tsx:318-382`
- `core/admin/ui/content-types/FieldEditor.tsx:106-108`
- `core/admin/ui/content-types/SchemaBuilder.tsx:221-245`
- `core/services/kits/solutionKitsInstallService.ts:2050-2213`
  - inspect rollback's direct content type delete/restore path and either route
    it through the guarded contract or record the owner responsibility and
    equivalent rollback-safe guard.
- `tests/integration/routes/contentTypes.test.ts`
- `tests/vitest/assistant/actionExecutorService.test.ts`
- `tests/vitest/admin/contentTypesClient.test.ts`
- `tests/vitest/ui/content-type-table.test.tsx`
- `tests/vitest/ui/content-type-editor.test.tsx`

## Security Contract

- Visibility: internal admin UI and `/admin/api/content-types/:id`.
- Auth model: unchanged admin session/API-key path.
- RBAC: `content:write` for delete and schema updates.
- CSRF: required for content type delete and schema save.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: route continues to reject unexpected delete
  payloads unless a future explicit confirmation token is added.
- Anti-abuse:
  - delete requires exact id/name/slug context in UI confirmation,
  - server blocks deletion when entries or other owner dependencies exist,
  - delete guards must not silently trigger `onDelete: "cascade"` side effects,
  - delete guards must not leave a second unguarded delete path in another
    existing owner,
  - field removal confirmation must name the field and avoid accidental
    selection drift,
  - error messages must be machine-readable internally and user-readable in UI.

## Testing Requirements

- Bun route/service:
  - delete zero-entry content type succeeds,
  - delete with entries returns a mapped conflict,
  - delete with custom screens/taxonomies/settings/listing references returns a
    mapped conflict or a named follow-up owner when the dependency cannot be
    checked in this leaf,
  - delete missing id returns mapped not found,
  - route registration still includes DELETE,
  - assistant `content-type.delete` execution uses the same guarded service
    contract or has a named owner/responsibility note for any conflict mapping
    that remains outside this leaf.
- Vitest:
  - list/editor delete confirmation flow,
  - client cache invalidation after delete,
  - field-removal confirmation and cancel/confirm/undo states.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Content type delete is visible but guarded and confirmed.
2. Content types with entries cannot be deleted silently.
3. Field removal is confirmed and recoverable within the editor workflow.
