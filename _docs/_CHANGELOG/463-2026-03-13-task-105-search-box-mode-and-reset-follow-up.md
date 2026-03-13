# 463. TASK-105 Search Box Mode And Reset Follow-Up

**Date:** 2026-03-13  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widgets
- Expanded `SearchBoxEditors` coverage around wizard mode switching between listing and global search, keeping the edited endpoint stable across mode changes, and clearing the listing-query selection back to the sentinel empty option.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/search-box-editor-wave.test.tsx`
- Targeted coverage re-check showed:
  - `SearchBoxEditors.tsx` -> `100.00%` lines / `73.80%` branches
