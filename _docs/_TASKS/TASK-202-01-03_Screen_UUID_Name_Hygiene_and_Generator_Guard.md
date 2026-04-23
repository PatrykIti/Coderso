# TASK-202-01-03: Screen UUID Name Hygiene and Generator Guard
# FileName: TASK-202-01-03_Screen_UUID_Name_Hygiene_and_Generator_Guard.md

**Priority:** Medium
**Category:** CMS/Engine + Custom Screens + Assistant
**Estimated Effort:** Medium
**Dependencies:** TASK-202-01; TASK-202-03-01/TASK-202-03-02 only for safe cleanup of existing records
**Status:** Done (2026-04-23)

---

## Overview

Investigate and stop the source of `Screen <uuid>` content type names reported
in `BUG-7`. The short-term fix is not a blind cleanup script. First identify the
writer and add a guard at that owner seam. Existing-record cleanup uses the safe
delete/archive path from `TASK-202-03`, but that cleanup dependency must not
block the source guard.

This leaf must follow the existing contract instead of inventing a parallel
generator. If the bug comes from a generic content-type writer, put the
normalization/guard in the current content type contract and make the callers use
it. If the bug comes from a direct writer that cannot delegate immediately, name
that owner and prove responsibility there with tests.

Do not create a detached screen-name helper or cleanup-only script to make this
report pass. The fix must execute in the current writer that creates or can
create content types. If ownership is unclear during implementation, document the
candidate owner, its responsibility, and the evidence before patching behavior.
Existing bad records remain data cleanup, not proof that the generator guard
failed. That cleanup is owned by the final source-report closure after
`TASK-202-03` makes delete/archive safe.

If the prevention fix requires a dependency from another leaf, keep that
dependency explicit and narrow. For example, source prevention must not wait for
delete UI, while existing-record cleanup must not run before guarded delete and
confirmation behavior exist.

Coordinate with `TASK-202-02-01` when the fix touches shared content type
normalization or duplicate-name/slug validation. Writer inventory should be
recorded once and referenced by both leaves; do not create separate screen-name
and duplicate-name helper paths that can drift.

## Sub-Tasks

No child task files.

## Files to Inspect or Change

- `core/services/assistant/actionExecutorService.ts:2731-2762`
  - content type upsert execution.
- `core/services/assistant/cmsOperationActionMapper.ts:603-616`
  - provider draft to `content-type.upsert` mapping; ensure unsafe/generated
    names cannot bypass local review/normalization.
- `core/services/assistant/actionPlanSchema.ts:234-240`
  - strict action input normalization for content type upsert payloads.
- `core/services/assistant/operationPolicy/cmsResourcePolicies.ts:295-320`
  - policy owner for executable content-type upsert/delete actions.
- `core/services/assistant/blueprints/catalogFamilyBlueprint.ts`
  - generated catalog/screen naming inputs.
- `core/services/customScreens/customScreenService.ts:123-154`
  - custom screen creation normalization.
- `core/admin/ui/custom-screens/CustomScreenEditorPage.tsx:451-493`
  - custom screen content type selection UI.
- `core/services/content/typeService.ts:63-76`
  - content type creation guard if the writer is generic.
- `core/services/kits/solutionKitsInstallService.ts:1357-1475`
  - solution-kit content type upsert writer; keep kit blueprints readable and do
    not allow direct insert paths to drift from the content type contract.
- `core/services/kits/solutionKitsInstallService.ts:2050-2213`
  - solution-kit rollback can directly delete or restore content types; keep this
    owner named if the guard changes shared create/delete invariants.
- `tests/vitest/customScreens/customScreenService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts` for Bun-owned assistant
  executor logic.
- `tests/unit/assistant/actionExecutorService.db.test.ts` when the source guard
  depends on DB-backed executor behavior.
- `tests/vitest/assistant/action-plan-schema.test.ts` or
  `tests/vitest/assistant/cms-operation-action-mapper.test.ts` for Bun-free
  action input/schema/mapper coverage, depending on the identified writer.
- Solution-kit installer owner test if the source is a kit blueprint/direct
  `contentTypes` writer.

## Security Contract

- Visibility: internal admin/generator paths only.
- Auth model: unchanged for the owning path.
- RBAC: content type creation still requires `content:write`.
- CSRF: unchanged for admin UI creation; assistant execution keeps existing
  review/execute safeguards.
- Rate-limit bucket: existing admin/assistant buckets.
- Reject-unknown validation: generated names and slugs must pass existing
  content type validation.
- Anti-abuse:
  - do not auto-delete existing records in this leaf,
  - generated names must be human-readable and deterministic,
  - source tracing must not log secrets or raw entry data.

## Testing Requirements

- Bun/Vitest coverage in the current owner lane for the identified generator
  guard.
- Coverage must execute the production writer that created or could create the
  bad name (`typeService`, assistant mapper/executor, custom screen service, or
  solution-kit installer), not only a copied slug/name helper.
- Regression proving UUID-like fallback names are rejected or converted into a
  readable deterministic label.
- Regression proving direct content-type writers either delegate to the shared
  contract or have an explicitly documented owner/responsibility with equivalent
  validation. Include solution-kit install/rollback coverage if that owner keeps
  direct `contentTypes` writes.
- Manual inventory note in closure documenting which path created the reported
  records.
- Closure must distinguish source prevention from existing-record cleanup and
  must not claim the current instance is clean unless the duplicated/test/UUID
  records were removed or archived through the guarded path.

## Documentation Updates Required

- `_docs/CONTENT_TYPES_SPEC.md`
- `_docs/PLAYWRIGHT/SUMMARY-ENGINE.md` closure mapping.
- `_docs/_TASKS/README.md`

## Acceptance Criteria

1. The source of `Screen <uuid>` content type names is identified.
2. The owning path no longer creates unreadable UUID-based content type names.
3. Any direct writer that remains outside `typeService` has a named owner,
   responsibility, and test evidence for the same guard.
4. Cleanup of existing records is deferred until safe delete/cleanup evidence
   exists, but the source guard can close before cleanup.
