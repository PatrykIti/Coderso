# 347 - TASK-063-16-22 section empty placeholder preview

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-22

## Key Changes

### Post editor canvas
- Show the writing-canvas placeholder text when an empty section is not active.
- Treat empty rich text markup as empty for preview placeholders.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-editor-canvas-shared.test.tsx` -> pass.
