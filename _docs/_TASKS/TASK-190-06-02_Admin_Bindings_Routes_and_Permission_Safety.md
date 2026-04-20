# TASK-190-06-02: Admin Bindings, Routes, and Permission Safety
# FileName: TASK-190-06-02_Admin_Bindings_Routes_and_Permission_Safety.md

**Priority:** High
**Category:** Assistant/Core + Admin Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-190-06-01
**Status:** To Do

---

## Overview

Compose bindings, routes, and permission metadata for generated admin surfaces.

## Sub-Tasks

No child task files.

## Files to Change

- Add `core/services/assistant/blueprints/blueprintBindingComposer.ts`
- Update `core/services/assistant/actionPlanTypes.ts` only if new binding metadata is required.
- Add `tests/vitest/assistant/blueprint-binding-composer.test.ts`

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

## Testing Requirements

- Valid binding merge.
- Missing field rejects.
- Secret field rejects.
- Duplicate binding id dedupe.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md`
