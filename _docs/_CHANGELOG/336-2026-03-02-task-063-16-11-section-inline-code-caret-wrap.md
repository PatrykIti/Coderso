# 336 - TASK-063-16-11 section inline code caret wrap

Date: 2026-03-02  
Version: Unreleased  
Tasks: TASK-063-16-11

## Key Changes

### Inline code caret behavior
- Inline code/highlight now expand collapsed selections to the nearest word token so the command applies when the caret is inside text.

## Tests and Quality Gates
- `bun --cwd core lint` -> pass.
- `bun --cwd core lint:types` -> pass.
- `bun test tests/unit/ui/post-richtext-inline-wrapper.test.ts` -> pass.
