# 788 - TASK-251 custom screens builder hardening

**Date:** 2026-05-03
**Version:** Unreleased
**Tasks:** TASK-251, TASK-251-01, TASK-251-01-01, TASK-251-01-02, TASK-251-02, TASK-251-02-01, TASK-251-03, TASK-251-03-01, TASK-251-04

## Key Changes

### Workspace preview and record-backed canvas

- Replaced schema-only `Editor View` preview data with a cached-first first
  record owner shared by the mounted builder canvas and the preview dialog.
- Added explicit fallback messaging for `no-content-type`, `no-records`, and
  first-read failures instead of silently treating sample values as a real
  record.
- Widened the Custom Screens preview shell and aligned first-open `Editor View`
  framing with a desktop baseline closer to Pages.

### List View and binding contract hardening

- Moved visible-column reordering into the `List View` table header and replaced
  the lower reorder strip with a compact hidden-column tray.
- Introduced widget-owned binding targets for `screen-record-header` and
  `screen-field-value`, then switched the `Data` tab from ordinal `Binding N`
  cards to prop-centric cards with compatibility rows for preserved custom
  paths.
- Aligned writable binding detection with the real widget contract so only
  supported write-capable targets, such as `screen-field-value.value`, drive
  `supportsDedicatedEditor`, writable field lists, and assistant summaries.

### Docs and closure

- Updated Custom Screens UX, cache, widget, architecture, API, task-board, and
  widget-doc sources so the record-backed preview and widget-owned binding
  contract are documented in the repo-native source of truth.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-preview-data.test.ts tests/vitest/ui-integration/custom-screen-preview-owner.test.tsx tests/vitest/ui/custom-screen-workspace-preview-dialog.test.tsx tests/vitest/ui/custom-screen-binding-panel.test.tsx tests/vitest/ui-integration/custom-screen-editor-binding-flow.test.tsx tests/vitest/ui/custom-screen-list-view-canvas.test.tsx tests/vitest/customScreens/bindingResolver.test.ts tests/vitest/customScreens/capabilities.test.ts tests/vitest/admin/custom-screen-schemas.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/widgets/widgetRegistryBindingTargets.test.ts` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/widgets/screenEditorsBindingAware.test.tsx tests/vitest/widgets/screenLayoutEditors.test.tsx tests/vitest/assistant/admin-context-service.test.ts tests/vitest/assistant/admin-context-catalog-normalizer.test.ts tests/vitest/ui/use-assistant-admin-context.test.tsx tests/vitest/ui-integration/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-records.test.tsx` - passed.
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/custom-screens-list-wave.test.tsx tests/vitest/admin/advanced-modules.test.ts tests/vitest/ui/admin-shell-nav.test.tsx` - passed.
- `bun test tests/unit/widgets/registry.test.ts tests/unit/widgets/runtimeRegistry.test.ts` - passed.
- `bun run gates:coderso` - passed.
- `git diff --check` - passed.
