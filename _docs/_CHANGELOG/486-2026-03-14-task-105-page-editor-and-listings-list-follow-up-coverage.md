# 486. TASK-105 Page Editor and Listings List Follow-Up Coverage

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04, TASK-105-05

## Key Changes

### QA / Pages
- Expanded `PageEditor` coverage for wrapper image fallback, empty-block initial selection null, default-block refresh fallback, and save/autosave payload fallback when `currentData` is missing.

### QA / Listings
- Added direct interactive `ListingListPage` coverage for loading states, load alerts, API and generic delete failures, and successful refresh after delete.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/page-editor-shell-wave.test.tsx`
  - `tests/vitest/ui/listing-list-page-wave.test.tsx`
- Full `bun run test:coverage` passed with:
  - `459` files / `1705` tests
  - `% Stmts`: `69.05`
  - `% Branch`: `60.09`
  - `% Funcs`: `72.52`
  - `% Lines`: `72.21`
