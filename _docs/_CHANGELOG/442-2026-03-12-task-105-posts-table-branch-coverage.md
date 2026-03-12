# 442. TASK-105 Posts Table Branch Coverage

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Admin UI
- Added direct `happy-dom` coverage for `PostsTable` empty state, fallback status/author/tag/date rendering, row action wiring, and the optional delete-action branch.

### Validation
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/posts-table-wave.test.tsx`
  - `tests/vitest/ui/page-post-list-wave.test.tsx`
  - `tests/vitest/ui/post-editor-page.test.tsx`
  - `tests/vitest/ui/posts-list.test.tsx`
- Targeted coverage re-check showed:
  - `PostsTable.tsx` -> `100%` lines / `96.55%` branches
