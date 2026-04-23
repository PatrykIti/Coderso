# TASK-203-01: Metadata Save, Status, and Feedback Contract
# FileName: TASK-203-01_Metadata_Save_Status_and_Feedback_Contract.md

**Priority:** High
**Category:** CMS/Entries + Admin/API + Admin/UI
**Estimated Effort:** Large
**Dependencies:** TASK-203, TASK-043, TASK-053-07
**Status:** Done
**Completed:** 2026-04-23

---

## Overview

Repair metadata save and save-feedback behavior from `BUG-1`, `BUG-5`,
`BUG-7`, and `UX-2`. Use the current checked-in call graph as the source of
truth; if toolbar `Update` no longer calls the metadata endpoint, keep the fix
on the actual metadata/status path and do not add a compatibility detour.

Current code paths:

- `EntryEditor.tsx:364-389` saves title/slug/data.
- `EntryEditor.tsx:391-423` handles publish/update intent. In the current code,
  the already-published branch delegates to content save; metadata/status writes
  stay under `handleSaveMetadata()`.
- `EntryEditor.tsx:425-428` changes status locally.
- `EntryEditor.tsx:470-525` saves metadata.
- `EntryEditor.tsx:641-670` renders toolbar save/update.
- `EntryEditor.tsx:843-876` renders a second sidebar `Save draft`.

## Sub-Tasks

- `TASK-203-01-01_Metadata_Route_Service_Error_Mapping_and_API_Client_State.md`
- `TASK-203-01-02_Editor_Save_Update_Metadata_Feedback_and_Dirty_State.md`
- `TASK-203-01-03_Status_Save_Action_Consolidation_and_Metadata_Dirty_Guard.md`

## Scope

- Map known metadata service errors through `contentEntryRoutes`.
- Enforce the existing publish contract when metadata status changes publish an
  entry: `content:write` can save metadata, but a `published` transition also
  needs `content:publish`.
- Keep `entriesClient.updateEntryMetadata()` cache updates authoritative.
- Show success/failure feedback for metadata, draft save, publish, and update.
- Track status/schedule/taxonomy/SEO as metadata dirty state.
- Remove or relabel duplicate `Save draft` so each action has one role.
- Reuse the existing admin feedback/toast mount and dirty-state patterns instead
  of introducing an Entries-only notifier or navigation guard.

Out of scope:

- autosave,
- entry data model changes,
- Posts editor save behavior changes,
- new shared toast infrastructure unless the existing mount is missing.

## Files to Change

- `core/server/routes/contentEntryRoutes.ts:47-85`
- `core/server/routes/contentEntryRoutes.ts:151-205`
- `core/services/content/entryService.ts:694-770`
- `core/server/validation/contentSchemas.ts:51-88`
- `core/admin/services/entriesClient.ts:291-314`
- `core/admin/ui/entries/EntryEditor.tsx:364-525`
- `core/admin/ui/entries/EntryEditor.tsx:641-876`
- `core/admin/ui/entries/EntryMetadataPanel.tsx:479-486`
- `core/admin/app/AdminApp.tsx`
- `core/admin/components/ui/sonner.tsx`
- `tests/integration/routes/contentTypes.test.ts`
- `tests/unit/content/entryService.test.ts`
- `tests/vitest/admin/entriesClient.test.ts`
- `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
- `tests/vitest/ui/entry-metadata.test.tsx`

## Security Contract

- Visibility: internal admin Entries UI and `/admin/api/content/:type/entries*`.
- Auth model: authenticated admin session/API-key path.
- RBAC: `content:write` for metadata/draft updates; `content:publish` for
  publish/unpublish transitions. The metadata route must not publish an entry
  through `content:write` alone; either delegate to the existing publish path or
  perform a conditional publish-permission check before calling the service
  branch that publishes.
- CSRF: all mutating calls continue through `apiRequest` with CSRF.
- Rate-limit bucket: existing `admin_write`.
- Reject-unknown validation: `contentEntryMetadataSchema` remains strict.
- Anti-abuse: bounded feedback only; no stack traces, tokens, headers, or DB
  details in the browser.

## Testing Requirements

- Vitest:
  - metadata success/failure feedback,
  - save/update success/failure feedback,
  - metadata dirty state,
  - cache updates/broadcasts in `entriesClient`.
- Bun:
  - route maps known service errors to `ApiError`,
  - metadata-driven publish is rejected without `content:publish`,
  - service preserves taxonomy/tags/schedule/SEO behavior,
  - metadata route registration remains stable.

## Documentation Updates Required

- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `_docs/ADMIN_CACHE.md` only if cache semantics change
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. Metadata 500s and known service failures produce actionable UI feedback.
2. Successful save/update/metadata actions produce visible feedback.
3. Status edits cannot be lost silently.
4. The editor no longer exposes two indistinguishable `Save draft` actions.
5. Publishing through metadata follows the same `content:publish` requirement as
   the dedicated publish route.
