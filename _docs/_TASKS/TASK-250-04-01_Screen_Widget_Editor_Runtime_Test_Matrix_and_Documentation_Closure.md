# TASK-250-04-01: Screen Widget Editor/Runtime Test Matrix and Documentation Closure
# FileName: TASK-250-04-01_Screen_Widget_Editor_Runtime_Test_Matrix_and_Documentation_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-250-03-02
**Status:** To Do

---

## Overview

Capture the validation matrix for the improved `screen-*` widget family and
sync the resulting product/runtime/editor contract into docs, board, and
changelog.

## Sub-Tasks

No child task files.

## Files to Change

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`
- `_docs/_TASKS/TASK-250*.md`

## Implementation Pseudocode

```ts
const validationMatrix = {
  lint: "bun --cwd core lint",
  types: "bun --cwd core lint:types",
  vitest: [
    "screen-widgets-editor-wave",
    "screenWidgets",
    "custom-screen-binding-panel",
    "custom-screen-workspace-preview-dialog",
    "custom-screen-records",
    "custom-screen-widget-picker",
  ],
  bun: [
    "tests/unit/widgets/registry.test.ts",
    "tests/unit/widgets/runtimeRegistry.test.ts",
  ],
  gates: "bun run gates:coderso",
};
```

## Security Contract

- Visibility: internal QA/docs flow only.
- Auth model: authenticated admin session if replay is used.
- RBAC: unchanged existing content permissions.
- CSRF: unchanged existing admin clients.
- Rate-limit bucket: unchanged current admin buckets.
- Reject-unknown validation: closure docs must match the final `screen-*`
  contract and actual test owners.
- Anti-abuse: no public flow is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites from TASK-250-01 through TASK-250-03
- targeted Bun registry/runtime suites for the touched widget foundation
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

1. Screen widget validation is broad enough to catch future editor/runtime drift.
2. Docs and board closure reflect the improved parity goals and remaining
   intentional differences.
3. Validation explicitly covers `none` / `clear` style-removal behavior for the
   touched screen widget controls.
