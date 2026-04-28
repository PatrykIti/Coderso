# 293 - Admin Dev StrictMode Fetch Diagnostics Fix

- **Date:** 2026-02-21
- **Version:** 0.1.293
- **Tasks:** TASK-058

## Key Changes

### Root Cause and Runtime Policy
- Diagnosed duplicated admin fetches on every screen in dev as React StrictMode double-mount behavior.
- Updated admin bootstrap in `core/admin/main.tsx` to make StrictMode opt-in in dev instead of default.

### New StrictMode Switch
- Added `core/admin/utils/strictMode.ts` with typed env parsing:
  - `shouldEnableAdminStrictMode`
- New optional env:
  - `VITE_ADMIN_STRICT_MODE=true` enables StrictMode checks in dev.
  - Default (empty/false) runs single mount in dev for clean request diagnostics.

### Test Coverage
- Added unit tests:
  - `tests/unit/admin/strictMode.test.ts`

### Documentation and Env
- Updated `.env.example` with `VITE_ADMIN_STRICT_MODE`.
- Updated `_docs/ADMIN_CACHE.md` diagnostics note with the new StrictMode contract.

## Tests and Validation
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/admin/strictMode.test.ts`

## Result
- Duplicate per-screen mount fetches in admin dev mode are removed by default, while keeping StrictMode available as an explicit diagnostics mode.
