# 420. TASK-105 Server Helper Suite Migration

**Date:** 2026-03-12  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-11, TASK-105-11-03, TASK-105-11-03-06

## Key Changes

### QA / Runner Ownership
- Moved the Bun-free server helper suites from `tests/unit/server/*` into `tests/vitest/server/*`.
- Specifically moved `errorHandler`, `requestBody`, `routeMatcher`, `solutionKitSchemas`, and `styleUrl`.
- Left the remaining server unit suites in Bun because they still validate server-boundary behavior or remain tied to settings/runtime concerns.

### Validation
- Targeted Vitest run passed for the migrated server helper suites.
- Re-ran `bun --cwd core lint` and `bun --cwd core lint:types`.

### Remaining Focus
- The remaining runner split backlog is now mostly `search` import-coupling and the intentionally Bun-owned server/runtime/database cases.
