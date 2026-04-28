# 342 - TASK-063-16-17 section toolbar typography row

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-17

## Key Changes

### Toolbar layout
- Moved font family and text size controls into a dedicated typography row with inline context text.
- Relocated the "More formatting" toggle to the typography row and aligned it to the right.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar.test.tsx` -> pass.
