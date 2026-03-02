# 348 - TASK-063-07 details inspector tabs and preferences

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-07, TASK-063-07-01, TASK-063-07-02, TASK-063-07-03

## Key Changes

### Details inspector
- Consolidated the `Post/Block` tabs into `PostDetailsSidebar` with a selection-aware fallback.
- Standardized inspector section chrome and clamped numeric inputs for safer block settings.
- Moved preference persistence into `usePostEditorPreferences` with local-first + user settings sync.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test:full` -> pass.
