# TASK-203: Entries Admin QA Metadata, Rich Text, and Editor UX
# FileName: TASK-203_Entries_Admin_QA_Metadata_Richtext_and_Editor_UX.md

**Priority:** High
**Category:** CMS/Entries + Admin/UI + UX + Accessibility
**Estimated Effort:** Large
**Dependencies:** TASK-003, TASK-043, TASK-048, TASK-053-07, TASK-059
**Status:** To Do

---

## Overview

Address the Entries admin findings from `_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md`
without changing the `content_entries` storage model or creating parallel
Entries editor systems.

Findings covered by this family:

- `BUG-1`: metadata/status save paths can surface a raw metadata endpoint 500
  and no actionable UI feedback. Verify the current checked-in call path before
  patching; do not assume toolbar `Update` still calls metadata if the code has
  already diverged.
- `BUG-2`: Engine `richtext` fields render as plain textarea controls.
- `BUG-3`: row delete uses native `window.confirm()`.
- `BUG-4`: row `Duplicate` is visible but currently has no real handler.
- `BUG-5`: duplicate `Save draft` actions make save responsibility unclear.
- `BUG-6`: editor lacks an in-context delete/danger-zone action.
- `BUG-7`: save/update success feedback is missing.
- `BUG-8`: SEO preview hardcodes `https://nextless.cms/blog/...`.
- `UX-1`: content-type sidebar needs better grouping/filtering for 35+ types
  and readable disambiguation when multiple types share the same name.
- `UX-2`: status changes are local until a separate metadata save.
- `UX-3`: `What is this?` help is always expanded.
- `UX-4`: preview needs shared-runtime parity and 404 recovery evidence.
- `UX-5`: disabled taxonomy state lacks a link to the owning Engine settings.

Closure must map every report item to a fixed leaf, explicit follow-up, or
documented out-of-scope decision.

Execution contract for this family:

- repair the existing Entries contracts instead of creating parallel editor,
  preview, route, or storage systems;
- do not duplicate code paths that already have owners; reuse current
  `EntryEditor`, `FieldRenderer`, `EntryMetadataPanel`, `entriesClient`,
  `contentEntryRoutes`, `entryService`, `previewUrls`, and public runtime seams;
- keep every fix on the checked-in owner that already carries the responsibility;
  do not add a new helper, component, route, cache path, or adapter until the leaf
  records why the current owner cannot keep the contract readable;
- every leaf must start from the current checked-in owner code, not from stale
  report assumptions; if the code moved, update the owner notes in that leaf
  before patching implementation;
- do not add production fallbacks, one-off wrappers, local toasters, duplicate
  dialogs, or alternate API routes only to satisfy tests; adjust the existing
  owner or its tests to match the real contract;
- fix the checked-in contracts that exist today before adding abstractions; do
  not introduce convenience wrappers, duplicate routes, duplicate dialogs, or
  one-off helpers when the current owner can carry the behavior cleanly;
- every fix must name the owner responsible for the behavior it changes; if an
  owner boundary is unclear during implementation, document the decision in the
  leaf before patching code;
- dependencies between leaves are implementation constraints, not suggestions:
  use the metadata feedback/dirty-state work before relying on shared feedback
  from row/delete/duplicate flows, and use current cache/navigation helpers
  before adding any new helper;
- new helpers/components are allowed only when the current owner seam cannot keep
  the existing contract readable; the leaf must name the owner, responsibility,
  and why reuse through the current Entries/preview/route/cache/navigation path is
  not enough;
- keep the fix tied to current source files and repo docs; if a report symptom
  is already partially fixed by newer code, update the leaf with current
  evidence and close only the remaining gap instead of reintroducing stale
  assumptions;
- use current repo helpers for navigation, cache, validation, CSRF, preview URL
  resolution, rich text normalization, and app dialogs instead of inventing
  one-off replacements;
- keep implementation tied to the code that exists in this branch and avoid
  speculative redesigns outside the Playwright findings.
- mocked shell tests may prove wiring only. A leaf that changes
  `FieldRenderer`, `EntryMetadataPanel`, `RuntimePreviewDialog`,
  `EntryTypeSidebar`, route/service behavior, or cache/client behavior must add
  or update direct owner coverage for that module; closure must not accept
  assertions hidden behind mocks as the only proof of the real contract.

## Sub-Tasks

- `TASK-203-01_Metadata_Save_Status_and_Feedback_Contract.md`
- `TASK-203-02_Schema_Driven_Rich_Text_and_Runtime_Preview.md`
- `TASK-203-03_Row_Actions_Delete_Duplicate_and_Danger_Zone.md`
- `TASK-203-04_Content_Type_Sidebar_SEO_Taxonomy_and_Help_Guidance.md`
- `TASK-203-05_QA_Docs_and_Closure.md`

## Scope

1. Metadata and save confidence:
   - route/service/client error mapping,
   - success/failure feedback,
   - explicit metadata dirty state,
   - unambiguous save actions.
2. Schema-driven editing and preview:
   - real rich text editor for Engine `richtext`,
   - legacy string compatibility,
   - shared runtime preview failure handling.
3. Row and destructive actions:
   - branded row/bulk/editor delete confirmation,
   - real duplicate flow through the existing Entries route/client/service
     owners. Removing the visible action is outside this family unless a
     separate product decision changes the report closure and task scope before
     implementation starts.
4. Sidebar and metadata affordances:
   - non-destructive content-type grouping/filtering and duplicate-name
     disambiguation,
   - SEO URL from settings/content routes,
   - taxonomy enablement link,
   - collapsible help.
5. QA/docs/closure:
   - targeted Bun/Vitest validation,
   - Playwright report replay,
   - docs, board, changelog, and source-report closure.

Out of scope:

- DB cleanup for generated `Screen [UUID]` content types,
- moving Entries onto Posts storage/routes,
- new public write endpoints,
- admin cache/router rewrites,
- broad Playwright lane migration.

## Architecture

Current owner seams:

- Entries list/row/bulk/sidebar:
  - `core/admin/ui/entries/EntryList.tsx:57`
  - `core/admin/ui/entries/EntryList.tsx:231`
  - `core/admin/ui/entries/EntryList.tsx:311`
  - `core/admin/ui/entries/EntryTable.tsx:71`
  - `core/admin/ui/entries/EntryTypeSidebar.tsx:33`
- Entry editor save/metadata/preview:
  - `core/admin/ui/entries/EntryEditor.tsx:110`
  - `core/admin/ui/entries/EntryEditor.tsx:321`
  - `core/admin/ui/entries/EntryEditor.tsx:364`
  - `core/admin/ui/entries/EntryEditor.tsx:391`
  - `core/admin/ui/entries/EntryEditor.tsx:470`
  - `core/admin/ui/entries/EntryEditor.tsx:641`
  - `core/admin/ui/entries/EntryEditor.tsx:843`
- Metadata panel:
  - `core/admin/ui/entries/EntryMetadataPanel.tsx:83`
  - `core/admin/ui/entries/EntryMetadataPanel.tsx:107`
  - `core/admin/ui/entries/EntryMetadataPanel.tsx:314`
  - `core/admin/ui/entries/EntryMetadataPanel.tsx:382`
- Field rendering:
  - `core/admin/ui/entries/FieldRenderer.tsx:164`
  - `core/admin/ui/entries/FieldRenderer.tsx:212`
  - `core/admin/ui/content-types/schemaMapping.ts`
- Client/route/service:
  - `core/admin/services/entriesClient.ts:291`
  - `core/admin/services/entriesClient.ts:366`
  - `core/server/routes/contentEntryRoutes.ts:87`
  - `core/server/routes/contentEntryRoutes.ts:151`
  - `core/server/routes/contentEntryRoutes.ts:220`
  - `core/server/validation/contentSchemas.ts:51`
  - `core/services/content/entryService.ts:533`
  - `core/services/content/entryService.ts:565`
  - `core/services/content/entryService.ts:716`
  - `core/services/content/entryService.ts:694`
  - `core/server/publicSite.tsx:841`
  - `core/server/publicSite.tsx:864`
  - `core/server/utils/previewUrls.ts`
  - `core/admin/app/AdminApp.tsx:549`
  - `core/admin/utils/adminPaths.ts:64`

Reuse-first rules:

- keep `EntryEditor` as the Entries owner;
- do not import Posts storage/runtime shells into `FieldRenderer`;
- extract shared rich text pieces only if they stay Bun-free and reuse the
  existing Posts rich text adapter/serializer/sanitizer contracts where they are
  a real fit;
- pass SEO/taxonomy display context into `EntryMetadataPanel` instead of
  fetching inside the panel;
- keep cache invalidation in `entriesClient`/`cacheBus`;
- use shared admin path/link helpers for new internal links;
- keep destructive actions exact-id and visible-scope based.
- keep preview token creation in `contentEntryRoutes`/`entryService`, preview
  URL construction in `previewUrls`, and token consumption/runtime rendering in
  `publicSite`; UI work alone cannot close the report's content-preview 404.

## Security Contract

- Visibility: internal admin Entries UI plus existing read-only token preview.
- Auth model: authenticated admin session/API key where supported.
- RBAC: `content:read` for reads/preview token creation, `content:write` for
  draft/metadata writes, and `content:publish` for any transition that publishes
  an entry. Metadata saves must not allow a `published` status transition through
  `content:write` alone.
- CSRF: all mutating admin calls continue through shared CSRF client behavior.
- Rate-limit buckets: existing `admin_read`, `admin_write`, `public_read`.
- Reject-unknown validation: create/update/metadata/duplicate payloads remain
  schema-first and strict.
- Anti-abuse:
  - no public write path,
  - destructive actions require confirmation,
  - duplicate must create a draft and preserve slug uniqueness,
  - preview/feedback must not expose tokens, headers, stack traces, or secrets.

## Implementation Order

1. Fix metadata route/client state and save/status feedback.
2. Fix rich text rendering and runtime preview parity.
3. Replace native confirms and wire duplicate/danger-zone actions.
4. Tighten sidebar, SEO, taxonomy, and help guidance.
5. Replay report, sync docs, board, changelog, and closure notes.

Dependency notes:

- `TASK-203-01-01` must land before UI feedback relies on bounded metadata
  errors, because it owns route/service error mapping and client cache semantics.
- `TASK-203-01-02` must land before delete/duplicate leaves depend on shared
  success/error feedback.
- `TASK-203-01-03` must build on the dirty-state model from `TASK-203-01-02`
  instead of adding a separate guard.
- `TASK-203-02-02` cannot close the preview 404 from the report without
  `publicSite`/runtime proof or an exact follow-up owner.
- `TASK-203-03-02` must reuse the existing
  `EntryTable` -> `EntryList` -> `entriesClient` -> `contentEntryRoutes` ->
  `entryService` path; a product decision to remove Duplicate must be a separate
  task before implementation.
- `TASK-203-04-02` must reuse `site.contentRoutes`, `siteSettingsClient`,
  `AdminLink`, and `adminPaths` for SEO/taxonomy navigation instead of adding
  Entries-only URL or route helpers.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Vitest owner suites:
  - `tests/vitest/ui/entry-list-wave.test.tsx`
  - `tests/vitest/ui/entry-table-wave.test.tsx`
  - `tests/vitest/ui/entry-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/entry-metadata.test.tsx`
  - `tests/vitest/ui/content-entry-editor.test.tsx`
  - `tests/vitest/ui/entry-field-relation.test.tsx`
  - `tests/vitest/ui/content-entries.test.tsx`
  - `tests/vitest/ui/entry-bulk-actions.test.tsx`
  - `tests/vitest/ui/runtime-preview-dialog.test.tsx`
  - `tests/vitest/admin/entriesClient.test.ts`
  - `tests/vitest/admin/contentTypesClient.test.ts`
  - `tests/vitest/admin/siteSettingsClient.test.ts`
  - `tests/vitest/admin/adminApp.test.tsx`
  - `tests/vitest/server/previewUrls.test.ts`
- Bun suites if route/service/runtime owners change:
  - `set -a && source .env && set +a && bun test tests/integration/routes/contentTypes.test.ts tests/unit/content/entryService.test.ts tests/unit/site/publicEntryRenderer.test.tsx`
- Metadata route tests must prove a publish transition is permission-gated by
  `content:publish`, not only by `content:write` or actor presence.
- If content preview runtime behavior changes or remains suspicious:
  - `set -a && source .env && set +a && bun test tests/integration/runtime/pages-runtime.test.ts`
  - or an equivalent Bun runtime suite that creates an entry preview token and
    proves `/preview?type=content&token=...` returns the expected preview HTML
    or records a precise follow-up owner.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md`
- `_docs/PREVIEW_SPEC.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache semantics change
- `docs/coderso/entries-list-type-selection-and-creation.md`
- `docs/coderso/entry-editor-and-metadata.md`
- `docs/coderso/content-type-editor-and-schema-builder.md` if field/taxonomy
  guidance changes
- `_docs/PLAYWRIGHT/SUMMARY-ENTRIES.md` during closure
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-203 closes

## Acceptance Criteria

1. Every `BUG-*` and `UX-*` from the Entries report has an owner and closure
   path.
2. Metadata/status/save failures and successes are visible to users.
3. Engine `richtext` fields no longer render as textarea-only controls.
4. Delete/duplicate actions are explicit, confirmed where destructive, and
   cache-safe.
5. SEO URL, taxonomy guidance, preview failure handling, help density, and
   content-type sidebar scanability match current admin contracts.
