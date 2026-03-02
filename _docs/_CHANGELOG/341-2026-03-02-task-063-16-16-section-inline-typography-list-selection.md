# 341 - TASK-063-16-16 section inline typography list selection

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-16

## Key Changes

### List typography selection
- Inline typography changes now update list items so list markers and spacing track selection size changes without leaving nested spans behind.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/ui/post-richtext-inline-typography-selection.test.ts` -> pass.
