# 935 - Tabs editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-07

## Key Changes

### Widgets

- Split `tabs` so Wizard owns starter setup, Visual owns daily tab
  presentation/content/layout/style authoring, and Advanced is read-only
  diagnostics.
- Added the `tabs` v2 `editorContract` and kept Visual as the owner of variant
  selection.
- Left the one-time Wizard lifecycle to TASK-336-16; this change only separates
  ownership while the current builder still shows Wizard as an editor tab.

### QA

- Added focused Vitest coverage for mode ownership metadata, duplicate writable
  path prevention, Advanced read-only behavior, and strict widget contract
  validation.
- Verified targeted Playwright smoke for `tabs` with zero admin, metadata, and
  public failures.

### Docs

- Updated Tabs widget docs, TASK-336-07 closure notes, task board counts, and
  the Playwright re-audit status.
