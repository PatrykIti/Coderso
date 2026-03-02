# 340 - TASK-063-16-15 section inline typography preview persistence

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-15

## Key Changes

### Inline typography preview persistence
- Preserved inline typography spans during writing-canvas normalization so preview/front keep inline font family and text size.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-paste-normalizer.test.ts` -> pass.
