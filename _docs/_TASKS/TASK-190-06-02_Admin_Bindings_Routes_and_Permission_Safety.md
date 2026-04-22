# TASK-190-06-02: Admin Bindings, Routes, and Permission Safety
# FileName: TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md

**Priority:** High
**Category:** Assistant/Core + Admin Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-190-03-01, TASK-190-04-01, TASK-190-06-01
**Status:** To Do

---

## Overview

Compose bindings, routes, and permission metadata for generated admin surfaces.

Bindings should extend the current custom-screen binding contract, not create a
parallel admin-binding DSL. Reuse the existing `widgetId + propPath + field +
mode` model and current safe dot-path semantics wherever possible.

If canonical admin-screen resolution later needs explicit stable metadata such as
`collectionRole` and `compositionKey`, this leaf owns that extension under the
current custom-screen contract:

- add it to the custom-screen schema/create-update contract,
- persist it through current custom-screen service/client flows,
- keep workspace and matcher layers read-only consumers of that metadata.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintBindingComposer.ts`
- Update `core/services/assistant/actionPlanTypes.ts` if the existing
  `custom-screen.upsert` / `custom-screen.update` contracts must carry
  top-level `collectionRole` / `compositionKey` metadata
- Update `core/services/assistant/actionPlanSchema.ts` if the reviewed
  custom-screen action contracts widen for canonical screen metadata
- Update `core/services/assistant/actionExecutorService.ts` if assistant
  custom-screen execution must persist `collectionRole` / `compositionKey`
  through the existing custom-screen owner seam
- Update `core/services/assistant/actionFamilyContracts.ts` only if the widened
  reviewed custom-screen contract needs explicit contract metadata coverage
- Update current custom-screen binding helpers only if a small shared extraction
  is needed for both assistant composition and existing screen behavior
- Update `core/services/customScreens/customScreenSchemas.ts` only if
  exact `collectionRole` / `compositionKey` canonical screen-link metadata must
  become part of the current custom-screen schema
- Update `core/services/customScreens/customScreenService.ts` only if that
  metadata must persist through the current custom-screen owner seam
- Update `core/db/schema.ts` plus full migration artifacts if the current
  custom-screen storage contract must widen for persisted top-level canonical
  screen metadata
- Update `core/admin/services/customScreensClient.ts` only if that metadata must
  round-trip through the current admin cached client
- Add `tests/vitest/assistant/blueprint-binding-composer.test.ts`
- Update `tests/vitest/assistant/action-plan-schema.test.ts` if the reviewed
  custom-screen action contract widens for canonical screen metadata
- Update `tests/unit/assistant/actionExecutorService.test.ts` if assistant
  custom-screen execution writes canonical screen metadata
- Update `tests/vitest/admin/custom-screen-schemas.test.ts` only if the current
  custom-screen schema contract widens in this leaf
- Update `tests/vitest/customScreens/customScreenService.test.ts` only if the
  current custom-screen persistence contract widens in this leaf

Assistant transport rule:

- generated canonical admin screens must keep using the existing reviewed
  `custom-screen.upsert` / `custom-screen.update` action family,
- if composer-generated screens need persisted `collectionRole` /
  `compositionKey`, widen those existing action contracts in place through
  `actionPlanTypes.ts`, `actionPlanSchema.ts`, and `actionExecutorService.ts`,
  - do not add a metadata-only follow-up action,
  - do not add a planner-owned/custom-screen-sidecar store,
  - do not push those writes into workspace or matcher layers.

Canonical screen metadata contract:

- If canonical collection-screen resolution needs explicit stable metadata, this
  leaf freezes the exact field names instead of leaving them as "or equivalent".
- The metadata belongs to the current top-level custom-screen contract, next to
  existing fields such as `contentTypeId`, `status`, `showInSidebar`, and
  `sidebarLabel`; do not create a second nested metadata store or matcher-only
  extension point.
- Because the current custom-screen storage already persists those existing
  top-level fields outside `blocks` / `bindings`, this leaf must widen that
  current persisted owner seam directly when `collectionRole` /
  `compositionKey` are introduced:
  - update `core/db/schema.ts`,
  - add the SQL migration,
  - add `meta/*_snapshot.json`,
  - update `meta/_journal.json`,
  - do not hide the new metadata inside `blocks`, `bindings`, or a second
    workspace/matcher-only JSON bag.
- Minimal contract:

```ts
type CustomScreenCollectionLink = {
  collectionRole?: "canonical-admin-screen" | "secondary-admin-screen" | null;
  compositionKey?: string | null;
};
```

- `collectionRole` is the canonical/supplementary screen discriminator consumed
  by workspace and matcher logic.
- `compositionKey` is the stable adjunct identity key when multiple generated
  screens belong to the same collection.
- `actionPlanTypes.ts` and `actionPlanSchema.ts` own the strict reviewed
  assistant input for these fields when a composer-generated screen persists
  them through assistant execution.
- `actionExecutorService.ts` owns passing those fields into the existing
  custom-screen create/update service calls; assistant execution must not use a
  second ad-hoc metadata write path.
- `customScreenSchemas.ts` owns validation and reject-unknown behavior for these
  fields, `customScreenService.ts` owns persistence, and
  `customScreensClient.ts` owns cached round-trip.
- current custom-screen editor/client flows may round-trip only those same
  exact top-level persisted fields; they must not introduce a second
  workspace-only, matcher-only, or client-only copy of canonical screen
  metadata.
- Workspace, matcher, and assistant-context leaves consume only these persisted
  fields; they must not invent alternate names or browser-only copies.

## Pseudocode

```ts
export const composeBindings = (schema, adminSections) =>
  adminSections.flatMap((section) =>
    section.bindings.map((binding) => {
      assertSchemaField(schema, binding.field);
      assertSafePropPath(binding.propPath);
      return normalizeBinding(binding);
    })
  );
```

## Security Contract

- Visibility: internal admin planning.
- Auth model: unchanged.
- RBAC: declared permissions do not grant access.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: bindings are strict.
- Anti-abuse: no binding to arbitrary nested secret path.
- Secret handling: secret-like field bindings reject.
- Contract compatibility: generated bindings stay compatible with the current
  custom-screen schema and dot-path safety rules.

## Testing Requirements

- Valid binding merge.
- Missing field rejects.
- Secret field rejects.
- Duplicate binding id dedupe.
- Generated bindings stay compatible with the current custom-screen binding
  contract and current dot-path helper behavior.
- If composer-generated screens persist canonical metadata, the reviewed
  `custom-screen.upsert` / `custom-screen.update` contracts round-trip
  `collectionRole` / `compositionKey` through `actionPlanTypes.ts`,
  `actionPlanSchema.ts`, and `actionExecutorService.ts` rather than a second
  assistant-side metadata path.
- `collectionRole` / `compositionKey` round-trip through the current
  custom-screen schema/service/client/storage contract rather than a
  workspace-only or matcher-only store.
- If the current storage contract widens for these fields, DB migration
  artifacts are present and match the chosen top-level persistence shape.
- Downstream consumers read exactly `collectionRole` and `compositionKey`; they
  do not invent "equivalent" canonical-screen metadata names later in the tree.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
