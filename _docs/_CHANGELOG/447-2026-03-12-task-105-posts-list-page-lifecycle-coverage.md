# 447. TASK-105 Posts List Page Lifecycle Coverage

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Expanded `PostsListPage` coverage for no-cache load behavior, matching cache refreshes, drawer open/close routing, create-with-navigation flow, and preview/publish/unpublish/duplicate/delete error states.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/page-post-list-wave.test.tsx`
  - `tests/vitest/ui/posts-list.test.tsx`
- Targeted coverage re-check showed:
  - `PostsListPage.tsx` -> `94.69%` lines / `73.01%` branches
