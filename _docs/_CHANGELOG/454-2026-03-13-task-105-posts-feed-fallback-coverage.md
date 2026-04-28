# 454. TASK-105 Posts Feed Fallback Coverage

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widgets
- Expanded `PostsFeedEditors` coverage for invalid limit and select fallback handling plus async post-option cleanup after unmount, keeping the widget editor fully Bun-free while locking real fallback behavior.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/posts-feed-editor-wave.test.tsx`
- Targeted coverage re-check showed:
  - `PostsFeedEditors.tsx` -> `100.00%` lines / `73.33%` branches
