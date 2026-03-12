# 415. TASK-105 Legacy Bun-Free Duplicate Suite Cleanup

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-01

## Key Changes

### QA / Runner Ownership
- Removed legacy duplicate Bun-free suites from `tests/unit/ui/*` after confirming that the Vitest lane already carries those checks.
- Removed Bun-free duplicate suites from `tests/unit/admin/*` for `adminPaths`, `adminPrefetch`, `cacheBus`, `cacheRefresh`, `permissionsCatalog`, and `searchClient`.
- Removed duplicate Bun-free SDK helper suites for `exports` and `hookContext`, leaving the genuinely Bun-coupled SDK tests in Bun.

### Validation
- Confirmed the matching Vitest-owned replacement files pass in the shipped Vitest lane.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.
- Attempted Bun smoke validation for the remaining `tests/unit/admin/*` and `tests/unit/sdk/*` suites, but the DB-aware subset could not be re-run through the repo env bootstrap because `.env` is not present in this worktree.

### Remaining Focus
- The next migration slices are `tests/unit/customScreens/*` and the remaining Bun-free pure-domain leaves.
- The larger `refactor-first` clusters (`posts`, `forms`, `search`, `server`, `assistant`, `validation`) still need an explicit ownership audit instead of blind migration.
