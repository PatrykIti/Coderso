# 838 - TASK-252 widget inspector IA

**Date:** 2026-05-11
**Version:** Unreleased
**Tasks:** TASK-252, TASK-252-01

## Key Changes

### Shared inspector IA

- Replaced the crowded top-of-panel helper card with a compact selected-widget
  header plus tooltip-based `Info` affordances.
- Added shared `WidgetEditorModeRoot`, `WidgetEditorSection`, and
  `WidgetControlRow` primitives so Pages widget editors can emit consistent
  section shells, control rows, and accessibility wiring.
- Added stable automation metadata for migrated widget editing surfaces:
  `data-widget-editor`, `data-widget-editor-mode`,
  `data-widget-editor-section`, and `data-widget-control`.

### Builder slot placement and Section proof call site

- Moved slot and nested-content guidance into builder-owned `Visual` sections
  instead of rendering banners above the mode tabs.
- Added a dedicated `Regions` section for `section` so repeatable region slots
  can be added, removed, and inspected inside the same editing flow.
- Migrated `section` editor panels to the shared inspector primitives and
  synchronized the widget docs with the new `Regions` placement and metadata
  contract.

## Validation

- `git diff --check`
- `set -a && source .env && set +a && bun --cwd core lint`
- `set -a && source .env && set +a && bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run test:vitest -- tests/vitest/pageBuilder/wizardPanel.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/pageBuilder/advancedPanelLeaf.test.tsx tests/vitest/pageBuilder/blockSettings.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/ui/section-editor-wave.test.tsx`
- `set -a && source .env && set +a && bun run test:vitest -- tests/vitest/widgets/section.test.tsx tests/vitest/ui/info-tip.test.tsx`
