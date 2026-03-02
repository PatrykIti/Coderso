# 338 - TASK-063-16-13 section alignment visual styles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-13

## Key Changes

### Alignment visuals
- Added admin richtext styling for `data-align` attributes so left/center/right alignment is visible in the section canvas.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-serializer.test.ts` -> pass.
