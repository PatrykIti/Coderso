# 335 - TASK-063-16-10 section list strike code and clear formatting

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-10

## Key Changes

### Section and runtime formatting visibility
- Added list and code-block styling in admin richtext to show bullet/ordered list markers and code blocks.
- Added list and code-block styling in runtime post content so preview/public view matches formatting.
- Normalized `strike` tags to `<s>` during richtext serialization to preserve line-through formatting.

### Clear formatting behavior
- `Clear formatting` now converts block elements back to paragraph after inline formatting is stripped.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/posts/post-richtext-serializer.test.ts` -> pass.
