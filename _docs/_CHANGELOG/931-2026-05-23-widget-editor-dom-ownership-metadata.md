# 931. Widget editor DOM ownership metadata

- **Date:** 2026-05-23
- **Version:** Unreleased
- **Tasks:** TASK-336-02

## Key Changes

### Shared editor primitives
- `WidgetEditorSection` now emits optional mode and role metadata while keeping the stable section id contract.
- `WidgetControlRow` now supports ownership metadata, persisted control paths, and readonly markers for Playwright/Vitest ownership checks.
- Added `ReadonlyWidgetSummaryRow` for advanced diagnostics and non-writable summaries.

### First migrated editor
- Spacer Visual and Advanced sections now use explicit section ids with mode/role metadata instead of deriving ids from titles.
- Spacer Advanced payload diagnostics now render through the readonly summary primitive.

### QA and documentation
- Added focused DOM contract coverage for editor root, section, writable control, readonly summary, and action rows.
- Extended Spacer editor coverage and documented the DOM metadata naming convention in the widget spec.
