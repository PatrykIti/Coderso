# 337 - TASK-063-16-12 section inline code visual styles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-12

## Key Changes

### Inline code visuals
- Added inline code styling for admin richtext surface so inline code is visible in the section canvas.
- Added inline code styling for runtime post blocks so preview/front rendering matches the editor.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-block-runtime-renderer.test.tsx` -> pass.
