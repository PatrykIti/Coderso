# 343 - TASK-063-16-18 section toolbar type control

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-18

## Key Changes

### Toolbar controls
- Added a Type dropdown grouping paragraph/heading/quote commands and removed redundant heading/paragraph buttons.
- Routed block-format commands to block transforms for paragraph/heading/quote blocks while keeping list formatting as a dedicated group.
- Added block-transform command mapping helper with unit coverage.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/ui/post-richtext-block-transform.test.ts` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` -> pass.
- `bun test tests/unit/ui/post-editor-canvas-toolbar-profile-routing.test.tsx` -> pass.
