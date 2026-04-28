# 391. TASK-105 Stack and Spacer Widget Editor Coverage Follow-Up

**Date:** 2026-03-09  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct `happy-dom` coverage for `StackEditors` and `SpacerEditors`.
- Deepened `SplitLayoutEditors` coverage to close most of the remaining branch gaps around malformed payload fallbacks and safe no-op variant interactions.
- Kept the suites editor-owned: wizard, visual, and advanced flows are exercised through real token updates, responsive controls, wrap toggles, and diagnostics snapshot assertions.

### Coverage Progress
- Previous authoritative snapshot after the utility-layout slice: `58.91% stmts`, `49.63% branch`, `60.77% funcs`, `61.83% lines`
- Current authoritative snapshot after this slice: `59.77% stmts`, `49.99% branch`, `62.81% funcs`, `62.63% lines`
- `StackEditors.tsx` moved to `100.00%` lines / `58.33%` branches
- `SpacerEditors.tsx` moved to `97.50%` lines / `71.42%` branches
- `SplitLayoutEditors.tsx` moved to `100.00%` lines / `96.96%` branches
- Combined `core/admin/ui/widgets/editors/*` moved to `90.08%` lines / `68.30%` branches across `40` tracked files

### Remaining Focus
- The next low-line widget-editor hotspot is now `DividerEditors`.
- After `DividerEditors`, the remaining widget-editor work is mostly residual branch-gap closure in already line-complete files such as `GridColumnsEditors`, `ToggleBlockEditors`, `StackEditors`, and `SpacerEditors`.
