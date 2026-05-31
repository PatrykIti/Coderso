# 929. Shared row-flow child shell

- **Date:** 2026-05-23
- **Version:** Unreleased
- **Tasks:** TASK-328

## Key Changes

### Shared renderer contract
- `WidgetRenderContext` now supports an explicit `nestedSurface` contract with a shared `row-flow-item` child shell.
- `WidgetRenderer` keeps the default block-level section/container wrapper for normal public rendering, but can now render a lightweight nested child shell when a layout owner opts in.

### Layout-owner adoption
- Stack now adopts the shared `row-flow-item` shell for nested children, making one-dimensional row-flow compositions stop inheriting the default full-width widget wrapper inside the stack itself.
- Split Layout and Grid Columns remain on the default shell after the current audit because they still own pane/grid contracts rather than shared row-flow child flow.

### QA and documentation
- Added focused WidgetRenderer and Stack Vitest coverage for the new nested render surface.
- Updated Stack docs plus Spacer defer notes so the repository reflects that the shared child-shell prerequisite is now landed while horizontal Spacer remains a separate product decision.
