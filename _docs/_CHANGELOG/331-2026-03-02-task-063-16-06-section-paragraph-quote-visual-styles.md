# 331 - TASK-063-16-06 section paragraph quote visual styles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-06

## Key Changes

### Section quote visibility
- Added explicit blockquote styling for the admin richtext surface so quote vs paragraph is visible in the section canvas.
- Preview rendering now uses the richtext class to reuse the same styling when the block is not selected.

### Tests
- Added preview surface coverage for section blocks.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx` -> pass.
