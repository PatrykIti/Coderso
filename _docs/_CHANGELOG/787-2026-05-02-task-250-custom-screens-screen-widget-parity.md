# 787 - TASK-250 custom screens screen widget parity

**Date:** 2026-05-02
**Version:** Unreleased
**Tasks:** TASK-250, TASK-250-01, TASK-250-01-01, TASK-250-01-02, TASK-250-02, TASK-250-02-01, TASK-250-02-02, TASK-250-03, TASK-250-03-01, TASK-250-03-02, TASK-250-04, TASK-250-04-01

## Key Changes

### Screen widget editors

- Split `screen-record-header`, `screen-field-value`, `screen-field-group`,
  and `screen-two-column` into distinct `wizard`, `visual`, and `advanced`
  editor flows instead of aliasing one shared form.
- Added binding-aware Visual controls for `screen-record-header` and
  `screen-field-value`, including binding-state badges and direct `Data` tab
  handoff through the shared editor context.
- Expanded layout-widget guidance and clearable chrome controls so
  `screen-field-group` and `screen-two-column` behave closer to mature shared
  widget editors.

### Runtime and record editor parity

- Fixed nested selected-element ownership in the dedicated record editor so
  child widgets inside `screen-field-group` and `screen-two-column` hydrate the
  right-side `Selected Element` rail correctly and survive refresh.
- Reduced `ScreenWidgetReadOnlyBlock` to a thin pass-through over the canonical
  `WidgetRenderer`, keeping screen preview and record-editor read paths on the
  same renderer contract while leaving writable `screen-field-value` behavior
  inside the screen-owned canvas.
- Propagated the currently selected runtime widget into the active assistant
  surface context so child-widget targeting stays aligned with the `Selected
  Element` rail in the record editor.
- Strengthened the concrete `admin-editor-view` widget contract coverage for
  `screen-*` surfaces and `dataAccess` metadata.

### Docs and closure

- Added source-of-truth widget docs for `SCREEN_RECORD_HEADER`,
  `SCREEN_FIELD_VALUE`, and `SCREEN_FIELD_GROUP`, and refreshed the existing
  `SCREEN_TWO_COLUMN` doc.
- Updated the Custom Screens widget, editor UX, CMS API, and task-board docs to
  match the delivered parity contract.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun x vitest run tests/vitest/ui/screen-widgets-editor-wave.test.tsx tests/vitest/widgets/screenEditorsModeParity.test.tsx tests/vitest/widgets/screenEditorsBindingAware.test.tsx tests/vitest/widgets/screenLayoutEditors.test.tsx tests/vitest/widgets/screenWidgets.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/custom-screen-records.test.tsx tests/vitest/ui/custom-screens-page.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui-integration/custom-screen-widget-picker.test.tsx tests/vitest/widgets/renderer.test.tsx` - passed.
- `bun test tests/unit/widgets/registry.test.ts tests/unit/widgets/runtimeRegistry.test.ts` - passed.
- `set -a && source .env && set +a && bun run gates:coderso` - passed. DB-backed booking / kit / store reliability suites remained in their existing optional or skipped state where the gate already marks them non-blocking without the required runtime setup.
