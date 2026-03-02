# 339 - TASK-063-16-14 section inline typography selection

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-14

## Key Changes

### Inline typography selection
- Font family and text size controls now apply to selected text inside section richtext, falling back to block-wide typography changes when no selection exists.
- Added inline typography span sanitization and styling for admin canvas and runtime preview.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-serializer.test.ts` -> pass.
