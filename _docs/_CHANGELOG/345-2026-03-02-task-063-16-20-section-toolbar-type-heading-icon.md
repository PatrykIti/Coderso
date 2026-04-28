# 345 - TASK-063-16-20 section toolbar type heading icon

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-20

## Key Changes

### Toolbar UI
- Updated the Type dropdown Heading entry to use the generic lucide Heading icon.
- Removed extra borders around toolbar rows and the richtext editor surface for a cleaner look.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/integration/ui/post-richtext-toolbar-grouped-controls.test.tsx` -> pass.
