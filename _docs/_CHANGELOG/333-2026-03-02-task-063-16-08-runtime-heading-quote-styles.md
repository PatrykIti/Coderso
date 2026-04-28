# 333 - TASK-063-16-08 runtime heading quote styles

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-08

## Key Changes

### Runtime preview visibility
- Added explicit H1-H6 and blockquote styling for runtime post content so headings/quotes are visible in preview and public pages.
- Added runtime renderer coverage for quote node markup.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-block-runtime-renderer.test.tsx` -> pass.
