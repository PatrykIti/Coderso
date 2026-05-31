# TASK-336-01: Editor Contract Type and Registry Validator

# FileName: TASK-336-01_Editor_Contract_Type_and_Registry_Validator.md

**Priority:** High
**Category:** Widgets + Shared Contract + Type System
**Estimated Effort:** Large
**Dependencies:** TASK-336
**Status:** Done (2026-05-23)

---

## Overview

Create the typed `WidgetEditorContract` v2 and a pure validator that can inspect
widget editor ownership without importing admin runtime code.

This task must land before per-widget fixes. It provides the vocabulary and the
testable rules that later tasks use to remove duplicated controls and move the
Wizard toward one-time setup.

## Scope

- Add contract types to the widget domain layer.
- Add pure validation helpers that are safe for Vitest and do not import Bun,
  DB, settings, admin route modules, or browser-only code.
- Attach optional `editorContract` metadata to `WidgetDefinition`.
- Add a soft registry validation path that records errors for diagnostics
  without breaking existing widgets during migration.
- Add strict helper functions for tests and final closure.

## Sub-Tasks

- [x] Reuse the existing `EditorMode` type as `WidgetEditorMode` instead of
  creating a second source of truth, then define `WidgetEditorSectionRole`,
  `WidgetEditorSectionContract`, `WidgetEditorContract`, and
  `WidgetEditorContractError`.
- [x] Add `editorContract?: WidgetEditorContract` to `WidgetDefinition`.
- [x] Document the relationship between the existing `WidgetDefinition.editor`
  render callbacks and the new `editorContract` metadata. The callbacks remain
  the rendering mechanism; `editorContract` is the ownership/test contract.
- [x] Implement `validateWidgetEditorContract(definition, options)`.
- [x] Implement `assertValidWidgetEditorContract(definition, options)` for
  strict tests.
- [x] Wire soft validation into `registerWidget` without blocking current
  widgets.
- [x] Add fixture contracts that prove each validation rule fails and passes.
- [x] Add registry-level tests that can be tightened in `TASK-336-17`.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/types.ts` | Add the editor contract types and attach the optional contract to `WidgetDefinition`. |
| `core/widgets/editorContract.ts` | New pure validation module with error codes and no runtime imports. |
| `core/widgets/registry.ts` | Run soft validation on registration and expose strict validation helpers for tests. |
| `tests/vitest/widgets/editorContract.test.ts` | New Vitest suite for validator rules and registry behavior. |
| `_docs/WIDGETS.md` | Document the v2 contract vocabulary if this task lands production wording. |

## Implementation Pseudocode

```ts
type WidgetEditorContractErrorCode =
  | "editor_contract_missing_mode"
  | "editor_contract_empty_section_id"
  | "editor_contract_duplicate_section_id"
  | "editor_contract_duplicate_writable_path"
  | "editor_contract_advanced_writable_diagnostic"
  | "editor_contract_wizard_style_owner"
  | "editor_contract_unknown_role";

export function validateWidgetEditorContract(
  definition: Pick<WidgetDefinition, "type" | "editorContract">,
  options: { requireContract?: boolean } = {},
): WidgetEditorContractValidation {
  const errors: WidgetEditorContractError[] = [];
  if (!definition.editorContract) {
    if (options.requireContract) pushMissingContract(errors);
    return { ok: errors.length === 0, errors };
  }
  validateModes(definition, errors);
  validateSectionIds(definition, errors);
  validateWritableOwners(definition, errors);
  validateRoleRules(definition, errors);
  return { ok: errors.length === 0, errors };
}
```

Data flow:

- `WidgetDefinition` owns the metadata.
- Existing `WidgetDefinition.editor.wizard/visual/advanced` components continue
  to render the UI; `editorContract` describes and validates their ownership.
- `registerWidget` calls `validateWidgetEditorContract` in soft mode.
- Vitest imports only `core/widgets/*` pure modules.
- Later tasks populate `editorContract` widget by widget.

Error handling:

- Missing contracts are warnings until `TASK-336-17`.
- Invalid contracts return machine-readable error codes and widget type.
- Duplicate writable path errors include every conflicting mode/section.
- Unknown roles and empty ids fail even in soft mode diagnostics.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: unchanged for persisted widget data.
- Anti-abuse: not applicable.
- Secret handling: validation errors must not include secret values or full
  widget payload dumps.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

Regression-test shape:

- Missing mode produces `editor_contract_missing_mode`.
- Empty id produces `editor_contract_empty_section_id`.
- Duplicate section id across modes produces a duplicate-id error.
- Duplicate writable path across modes fails without an allowlist entry.
- Duplicate writable path passes only when the allowlist includes path, reason,
  and expiry task.
- `Advanced` diagnostics sections with writable paths fail.
- `Wizard` sections that own style/token paths fail.
- Missing `editorContract` passes in soft mode and fails in strict mode.

## Documentation Updates Required

- Update `_docs/WIDGETS.md` only if production contract terms are exposed in
  this task.
- Document that `editor` and `editorContract` are semantically distinct until
  strict enforcement lands in `TASK-336-17`.
- Add changelog/index updates when this leaf is marked Done, unless the family
  has an explicitly approved single closure changelog policy.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- The v2 editor contract types exist in the widget domain layer.
- The validator can run in Vitest without Bun/runtime side effects.
- Registry registration can report contract drift without blocking migration.
- Strict validation is available for final 38-widget closure.
