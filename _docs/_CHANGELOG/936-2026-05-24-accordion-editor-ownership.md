# 936 - Accordion editor ownership

Date: 2026-05-24
Version: Unreleased
Tasks: TASK-336-08

## Key Changes

### Widgets

- Split `accordion` so Wizard owns starter setup, Visual owns daily variant,
  item content, behavior, layout, and style authoring, and Advanced is read-only
  diagnostics.
- Added the `accordion` v2 `editorContract` and kept Visual as the owner of
  variant selection.
- Left the one-time Wizard lifecycle to TASK-336-16; this change only separates
  ownership while the current builder still shows Wizard as an editor tab.

### QA

- Added focused Vitest coverage for mode ownership metadata, duplicate writable
  path prevention, Advanced read-only behavior, and strict widget contract
  validation.
- Verified targeted Playwright smoke for `accordion` with zero admin, metadata,
  fixture, and public failures.

### Docs

- Updated Accordion widget docs, TASK-336-08 closure notes, task board counts,
  and the Playwright re-audit status.
