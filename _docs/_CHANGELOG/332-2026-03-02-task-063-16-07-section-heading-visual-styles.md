# 332 - TASK-063-16-07 section heading visual styles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-07

## Key Changes

### Section heading visibility
- Added explicit H1-H6 styling for the admin richtext surface so section headings are visually distinct.
- Preview rendering retains the richtext class to reuse the same heading styling.

### Tests
- Added preview render coverage for section heading markup.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx` -> pass.
