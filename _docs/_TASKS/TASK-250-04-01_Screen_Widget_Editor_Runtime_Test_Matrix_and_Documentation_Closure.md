# TASK-250-04-01: Screen Widget Editor/Runtime Test Matrix and Documentation Closure
# FileName: TASK-250-04-01_Screen_Widget_Editor_Runtime_Test_Matrix_and_Documentation_Closure.md

**Priority:** Medium
**Category:** Coderso Custom Screens + QA Closure
**Estimated Effort:** Medium
**Dependencies:** TASK-250-01, TASK-250-02, TASK-250-03
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
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` if missing
- `_docs/_WIDGETS/README.md`
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
    "screenEditorsModeParity",
    "screenEditorsBindingAware",
    "screenLayoutEditors",
    "screenWidgets",
    "custom-screen-binding-panel",
    "custom-screens-page",
    "custom-screen-workspace-preview-dialog",
    "custom-screen-records",
    "custom-screen-widget-picker",
  ],
  bunBaseline: [
    "tests/unit/widgets/registry.test.ts",
    "tests/unit/widgets/runtimeRegistry.test.ts",
  ],
  extraVitestWhenSharedRendererChanges: [
    "tests/vitest/widgets/renderer.test.tsx",
  ],
  gates: "bun run gates:coderso",
};
```

Record the lane intent explicitly in the closure note:

- rerun the current shipped Bun registry baseline while those suites remain the
  repo-owned contract today,
- if this family migrates Bun-free registry coverage to Vitest, replace the
  closure entry with the new Vitest equivalent and note the lane transition
  against `_docs/TESTING_STRATEGY.md`.

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
- targeted Vitest suites from TASK-250-01 through TASK-250-03, including all
  newly added editor-mode / binding-aware / layout / picker suites
- current shipped Bun registry/runtime baseline for the touched widget
  foundation until lane ownership changes explicitly
- `tests/vitest/widgets/renderer.test.tsx` if TASK-250-03-01 changes the shared
  `WidgetRenderer` contract
- `bun run gates:coderso`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SCREEN_TWO_COLUMN.md`
- create/update `_docs/_WIDGETS/SCREEN_RECORD_HEADER.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_VALUE.md` if missing
- create/update `_docs/_WIDGETS/SCREEN_FIELD_GROUP.md` if missing
- `_docs/_WIDGETS/README.md`
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
