# TASK-202-05: Save, Publish, Status, and QA Closure
# FileName: TASK-202-05_Save_Publish_Status_and_QA_Closure.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + DB + QA
**Estimated Effort:** Large
**Dependencies:** TASK-202, TASK-202-01, TASK-202-02, TASK-202-03, TASK-202-04
**Status:** To Do

---

## Overview

Make save/publish feedback real and close the Engine QA wave against the source
report. This subtask covers `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` finding
`BUG-3` and the final closure obligation for all TASK-202 leaves.

Current code shows the status mismatch:

- `ContentTypeList.tsx:30-36` hard-codes every row as `published`.
- `ContentTypeEditor.tsx:214-242` makes `Publish` call the same save path.
- `core/db/schema.ts:646-653` has no `status` column for content types.

## Sub-Tasks

- `TASK-202-05-01_Content_Type_Draft_Published_Status_Model_and_Migration.md`
- `TASK-202-05-02_Save_Draft_Publish_Feedback_Badge_and_Shared_Toaster.md`
- `TASK-202-05-03_QA_Docs_Changelog_and_Playwright_Source_Closure.md`

## Scope

- Decide and implement one truthful status contract:
  - preferred: add a real `draft` / `published` content type status model, or
  - alternative: remove fake publish/status semantics from UI if product
    explicitly rejects content type status.
- Add visible feedback after save, publish, create, duplicate, and delete.
- Keep the shared admin toaster ownership in `AdminApp`.
- Keep result-state ownership with the action leaf that performs the mutation:
  create in `TASK-202-02-01`, duplicate in `TASK-202-02-02`, delete in
  `TASK-202-03-02`, and save/publish in `TASK-202-05-02`.
- Keep cache updates and route prefetch consistent after status mutations.
- Replay all Engine report findings and update source docs with evidence.
- Inventory the existing duplicate/test/`Screen <uuid>` records from
  `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`. If the safe delete/archive path is
  available, clean them through that path or document why a named owner must
  handle the remaining data cleanup later.

Out of scope:

- entry publish semantics,
- public runtime publishing gates for content entries,
- a new notification provider,
- closing TASK-201 or sibling task families.

## Files to Change

- `core/db/schema.ts:646-653` if status is made real.
- `core/db/migrations/*`
- `core/db/migrations/meta/*_snapshot.json`
- `core/db/migrations/meta/_journal.json`
- `core/services/content/typeService.ts:24-99`
- `core/server/validation/contentSchemas.ts:1-20`
- `core/server/routes/contentTypeRoutes.ts:54-82`
- `core/admin/services/contentTypesClient.ts:26-40`
- `core/admin/ui/content-types/ContentTypeList.tsx:30-38`
- `core/admin/ui/content-types/ContentTypeEditor.tsx:214-242`
- `core/admin/app/AdminApp.tsx:826`
  - existing shared `<Toaster />` mount; keep feedback on the current admin
    host instead of adding an Engine-only provider.
- `core/admin/utils/adminPrefetch.ts:179-180` if warmup assumptions change.

## Security Contract

- Visibility: internal admin UI and `/admin/api/content-types*`.
- Auth model: unchanged admin session/API-key path.
- RBAC:
  - `content:write` for draft saves,
  - `content:publish` only if the route stack already supports a separate
    publish permission for content type status; otherwise keep `content:write`
    and document the current permission boundary explicitly.
- CSRF: required for status mutations.
- Rate-limit bucket: `admin_write`.
- Reject-unknown validation: status values are enum-only and reject unknown
  fields.
- Anti-abuse:
  - publish cannot bypass schema validation,
  - UI feedback must not display raw DB errors,
  - cache events must use sanitized ids/keys only.

## Testing Requirements

- DB-backed tests when status migration/service changes:
  - default status on create,
  - patch status validation,
  - status returned by list/detail.
- Vitest:
  - list badge renders real status,
  - save/publish toasts and button states,
  - duplicate/delete toast coverage is present in the action-owner leaves and
    reuses the same `AdminApp` toaster,
  - `contentTypesClient` cache updates on status mutations,
  - `AdminApp` still mounts the shared toaster.
- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- QA replay:
  - every `BUG-*` and `UX-*` item in
    `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` is marked fixed or linked to an open
    follow-up with owner evidence.
  - existing duplicate/test/`Screen <uuid>` records are either cleaned through
    the guarded path or recorded as open data cleanup with owner,
    responsibility, and dependency.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache events change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-202 closes.

## Acceptance Criteria

1. Save and publish provide visible, truthful feedback.
2. List status badges are backed by a real contract or removed from the fake
   contract path.
3. TASK-202 closes with source-report evidence, docs, changelog, and board sync.
4. Source-prevention fixes and existing-record cleanup are reported separately
   so the family does not hide remaining dirty data behind new validation.
