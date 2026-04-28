# 424. TASK-105 Server Settings Helper Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-07

## Key Changes

### QA / Runner Ownership
- Moved `hostPolicy`, `publicBaseUrl`, and `previewUrls` test coverage into `tests/vitest/server/*`.
- Removed import-time settings/DB coupling by lazy-loading settings access inside `baseUrl.ts` and `hostPolicy.ts`.
- Reduced the remaining Bun-owned server unit cluster to the truly server-bound cases only.

### Validation
- Targeted Vitest run passed for the migrated server settings-bound helper suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- The remaining Bun-owned server unit cases are now narrow and explicit.
- The only notable migration blocker left in the old refactor-first space is the DB-backed `searchHistoryService` plus a few deeper mixed service modules.
