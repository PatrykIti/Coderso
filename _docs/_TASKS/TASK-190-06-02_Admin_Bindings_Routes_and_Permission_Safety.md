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
`collectionRole`, `compositionKey`, or equivalent collection-link fields, this
leaf owns that extension under the current custom-screen contract:

- add it to the custom-screen schema/create-update contract,
- persist it through current custom-screen service/client flows,
- keep workspace and matcher layers read-only consumers of that metadata.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintBindingComposer.ts`
- Update `core/services/assistant/actionPlanTypes.ts` only if new binding metadata is required.
- Update current custom-screen binding helpers only if a small shared extraction
  is needed for both assistant composition and existing screen behavior
- Update `core/services/customScreens/customScreenSchemas.ts` only if
  `collectionRole`, `compositionKey`, or equivalent canonical screen-link
  metadata must become part of the current custom-screen schema
- Update `core/services/customScreens/customScreenService.ts` only if that
  metadata must persist through the current custom-screen owner seam
- Update `core/admin/services/customScreensClient.ts` only if that metadata must
  round-trip through the current admin cached client
- Add `tests/vitest/assistant/blueprint-binding-composer.test.ts`
- Update `tests/vitest/admin/custom-screen-schemas.test.ts` only if the current
  custom-screen schema contract widens in this leaf
- Update `tests/vitest/customScreens/customScreenService.test.ts` only if the
  current custom-screen persistence contract widens in this leaf

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
- Any added `collectionRole` / `compositionKey` metadata round-trips through the
  current custom-screen schema/service/client contract rather than a workspace-
  only or matcher-only store.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
