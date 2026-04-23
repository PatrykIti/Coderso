# TASK-202: Engine Admin QA Recovery and Content Type Governance
# FileName: TASK-202_Engine_Admin_QA_Recovery_and_Content_Type_Governance.md

**Priority:** High
**Category:** CMS/Engine + Admin/UI + UX + Security
**Estimated Effort:** Large
**Dependencies:** TASK-003, TASK-048, TASK-053-08, TASK-184-03, TASK-190
**Status:** To Do

---

## Overview

Address the defects and UX gaps captured in
`_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` for the Engine / Content Types admin
surface. This family is a correctness, governance, and authoring-confidence
wave for the already-shipped Engine module. It must not introduce a parallel
schema builder, a second content-type client, or a one-off cleanup script before
the existing owner seams are fixed.

The Playwright report covers:

### Bugs

- Critical: content types cannot be deleted from the list or editor.
- Critical: duplicate content type names make the list and relation target
  dropdown ambiguous.
- Medium: `Save draft` and `Publish` have no explicit success feedback.
- Medium: `Remove field` deletes a field immediately without confirmation.
- Medium: field keys do not auto-generate from labels.
- Low: content type creation stays on the list and gives no creation feedback.
- Low: many `Screen <uuid>` content types appear as empty published records.

### UX Gaps

- The list has no search, filters, or sort controls.
- Relation targets with duplicate names do not show enough context.
- Select fields still use a comma-separated text input.
- Number fields have no min/max/format/step controls.
- Existing schema labels can remain machine-readable values such as
  `featuredImage`.
- Content types cannot be duplicated from list or editor surfaces.

## Sub-Tasks

- `TASK-202-01_Engine_List_Discovery_and_Content_Type_Identity.md`
- `TASK-202-02_Create_Duplicate_and_Row_Action_Flows.md`
- `TASK-202-03_Destructive_Change_Safety_for_Content_Types_and_Fields.md`
- `TASK-202-04_Field_Authoring_and_Schema_Metadata_Controls.md`
- `TASK-202-05_Save_Publish_Status_and_QA_Closure.md`

## Scope

This umbrella covers five owner areas:

1. Engine list discovery and identity:
   - search by name and slug,
   - sort and status filters,
   - duplicate-name signals,
   - relation dropdown disambiguation,
   - source tracing for UUID-like screen type names.
2. Create, duplicate, and row actions:
   - duplicate-name validation in creation flows, with `typeService` and route
     error mapping as the authoritative guard instead of UI-only blocking,
   - create-to-editor navigation with feedback,
   - duplicate content type cloning without entries,
   - list/editor lifecycle action entry points.
3. Destructive safety:
   - content type delete guard that blocks types with entries and other existing
     owner dependencies that would otherwise cascade or orphan references unless
     a later explicit archive/cleanup contract is approved,
   - route/domain error mapping,
   - list/editor delete confirmation,
   - field removal confirmation and recovery.
4. Field authoring controls:
   - label-to-key auto-generation with manual lock,
   - readable label normalization for existing schema fields,
   - select option builder and multi-select schema contract,
   - number min/max/format/step schema mapping.
5. Status, feedback, and closure:
   - real content type `draft` / `published` status model or an explicit removal
     of fake status semantics,
   - shared toast feedback for save/publish/create/duplicate/delete,
   - source report replay and docs/changelog closure.

Out of scope:

- a new public content type API,
- a replacement data-modeling product,
- deleting or mutating production data as a cleanup shortcut,
- migrating content entry runtime behavior beyond schema metadata needed by this
  family,
- introducing a new Playwright lane before the current Bun/Vitest owner suites
  are covered,
- touching `TASK-201*` files or any sibling family owned by another agent.

## Architecture

Current owner seams in code:

- Engine list, create drawer, and table:
  - `core/admin/ui/content-types/ContentTypeList.tsx:22`
  - `core/admin/ui/content-types/ContentTypeTable.tsx:32`
  - `core/admin/ui/content-types/ContentTypeCreateDrawer.tsx:36`
- Editor and field settings:
  - `core/admin/ui/content-types/ContentTypeEditor.tsx:59`
  - `core/admin/ui/content-types/SchemaBuilder.tsx:139`
  - `core/admin/ui/content-types/FieldEditor.tsx:69`
  - `core/admin/ui/content-types/schemaMapping.ts:128`
- Admin client cache and route warmup:
  - `core/admin/services/contentTypesClient.ts:145`
  - `core/admin/utils/adminPrefetch.ts:179`
- API and service contract:
  - `core/server/routes/contentTypeRoutes.ts:34`
  - `core/services/content/typeService.ts:24`
  - `core/server/validation/contentSchemas.ts:1`
- DB contract if status is made real:
  - `core/db/schema.ts:646`
  - `core/db/migrations/*`
  - `core/db/migrations/meta/*_snapshot.json`
  - `core/db/migrations/meta/_journal.json`
- Related generation and screen seams to inspect before fixing `Screen <uuid>`
  records:
  - `core/services/assistant/actionExecutorService.ts:2731`
  - `core/services/assistant/cmsOperationActionMapper.ts:603`
  - `core/services/assistant/actionPlanSchema.ts:234`
  - `core/services/assistant/operationPolicy/cmsResourcePolicies.ts:295`
  - `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
  - `core/services/customScreens/customScreenService.ts:123`
  - `core/services/kits/solutionKitsInstallService.ts:1357`

Reuse-first rule:

- Keep `contentTypesClient.ts` as the single cached admin client for Engine
  reads/writes.
- Fix the current Engine contracts in their existing owners. Do not add
  duplicate clients, services, schema builders, validators, notification hosts,
  or helper layers when the repo already has a responsible owner.
- Keep existing domain owners as the source of truth. UI validation can improve
  feedback, but create/delete/status correctness must live in `typeService`,
  route validation/mapping, and the current DB/settings owner seams.
- Keep route modules orchestration-only: validate payloads, enforce permission,
  delegate business rules to `typeService`, and map known domain errors through
  centralized `mapContentTypeError`.
- Keep schema-field ownership in `SchemaBuilder.tsx`, `FieldEditor.tsx`, and
  `schemaMapping.ts`; routes should never duplicate field-control logic.
- Keep admin navigation through `adminPaths`, `AdminLink`, and
  `prefetchAdminRoute`.
- Reuse existing shared dialog/toast primitives and the `AdminApp` toaster
  mount rather than adding Engine-only notification infrastructure.
- Route every content-type creation/upsert path through the existing content type
  service/normalization contract where possible. If an owner still writes
  `contentTypes` directly, the leaf must name that owner and prove the same
  validation/responsibility in that owner rather than copying a second set of
  ad-hoc helpers.
- Use durable schema metadata in `xFieldConfig`; do not store UI-only state in
  browser cache or unversioned ad-hoc fields.
- Do not add parallel clients, cleanup scripts, schema builders, notification
  hosts, or generated helpers when an existing owner already exists. If
  ownership is unclear during implementation, document the responsible owner and
  the reason before writing the fix.
- If the current owner is unclear after inspection, the leaf must name the
  responsible area, its responsibility, and the reason before implementation.
  Do not hide unclear ownership behind a broad UI workaround.
- If an existing contract cannot safely cover a report item, keep the shipped
  fix inside current contracts and record a named follow-up with owner
  responsibility instead of inventing a new product path in this family.

## Security Contract

- Visibility: internal admin Engine UI and `/admin/api/content-types*` routes.
- Public endpoints: none.
- Auth model: existing authenticated admin session / admin API key where the
  shared admin stack supports it.
- RBAC:
  - `content:read` for list/detail/relation target reads.
  - `content:write` for create/update/duplicate/delete/status/schema changes.
- CSRF: required for all mutating admin routes through the existing admin API
  client.
- Rate-limit bucket: existing `admin_read` and `admin_write`.
- Reject-unknown validation:
  - keep route payload schemas strict,
  - extend schemas only with explicit status/duplicate/delete contracts when the
    owning leaf requires it.
- Anti-abuse:
  - no public write path,
  - destructive content type deletion requires exact selected type identity and
    a blocked-with-entries server guard,
  - field deletion requires confirmation and must not silently mutate unrelated
    schema keys,
  - browser feedback must not expose raw DB errors, CSRF tokens, or stack traces.

## Implementation Order

1. Land list identity and create/duplicate flow fixes so admins can find the
   right type and enter the editor confidently.
2. Land destructive guards before exposing visible delete controls broadly.
3. Land schema authoring controls and metadata mapping.
4. Land real status/feedback behavior and keep cache/prefetch stable.
5. Replay `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`, update docs, changelog, and the
   task board.

## Testing Requirements

- Baseline:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
- Vitest owner suites:
  - `tests/vitest/ui/content-type-table.test.tsx`
  - `tests/vitest/ui-integration/contentTypes.test.tsx`
  - `tests/vitest/ui/content-type-editor.test.tsx`
  - `tests/vitest/ui/field-editor-relation.test.tsx`
  - `tests/vitest/ui/field-editor-layout.test.tsx`
  - `tests/vitest/ui/schema-mapping.test.ts`
  - `tests/vitest/admin/contentTypesClient.test.ts`
  - `tests/vitest/admin/adminApp.test.tsx`
  - `tests/vitest/admin/adminPrefetch.test.ts` if route warmup changes.
- Bun route/service suites when route or DB behavior changes:
  - `set -a && source .env && set +a && bun test tests/integration/routes/contentTypes.test.ts`
  - content type service DB coverage when delete/status guards touch
    `typeService`.
- DB-backed changes must include migration SQL, snapshot, and journal updates.
- QA replay:
  - replay every `BUG-*` and `UX-*` item from
    `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` and record fixed/open evidence.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md`
- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/CONTENT_FIELDS.md`
- `_docs/CONTENT_RELATIONS.md`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` if cache keys/events
  change.
- `_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md` if assistant Engine action coverage
  expectations change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new `_docs/_CHANGELOG/*` entry when TASK-202 closes.

## Acceptance Criteria

1. Every Engine finding from `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` is mapped to a
   TASK-202 leaf and later to fixed/open evidence.
2. The list, create, duplicate, delete, and relation flows are unambiguous for
   duplicate names.
3. Destructive actions are confirmed and server-guarded.
4. Field authoring controls produce deterministic schema metadata and preserve
   backward compatibility.
5. Save/publish/status feedback is real and cache-consistent.
