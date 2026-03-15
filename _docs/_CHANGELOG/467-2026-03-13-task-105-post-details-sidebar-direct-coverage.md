# 467. TASK-105 Post Details Sidebar Direct Coverage

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-05

## Key Changes

### QA / Editor
- Added direct `happy-dom` coverage for `PostDetailsSidebar`, locking document-tab fallback when no block is selected and explicit block-tab routing when a block is available.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/post-details-sidebar-wave.test.tsx`
  - `tests/vitest/ui-integration/post-editor-details-tabs.test.tsx`
  - `tests/vitest/ui-integration/post-editor-keyboard-a11y.test.tsx`
- Targeted coverage re-check showed:
  - `PostDetailsSidebar.tsx` -> `100.00%` lines / `100.00%` branches
